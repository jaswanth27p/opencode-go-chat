import "server-only";
import { prisma } from "@/lib/prisma";
import { mastra } from "@/mastra";

export type OverviewStats = {
  totalConversations: number | null;
  totalMessages: number | null;
  tracesLast24h: number | null;
  errorsLast24h: number | null;
  avgLatencyMsLast24h: number | null;
  runsByDay: { day: string; success: number; error: number }[];
  runsByHour: { hour: string; success: number; error: number }[];
  modelUsage: { model: string; count: number }[];
  statusCounts: { success: number; error: number };
  latencyTrend: { day: string; avgLatencyMs: number }[];
  messagesByDay: { day: string; count: number }[];
};

async function safeCount(query: Promise<{ count: bigint }[]>): Promise<number | null> {
  try {
    const [{ count }] = await query;
    return Number(count);
  } catch (error) {
    console.error("[admin] metric query failed:", error);
    return null;
  }
}

export async function getObservabilityStore() {
  const storage = mastra.getStorage();
  if (!storage) {
    return undefined;
  }
  return storage.getStore("observability");
}

export async function getOverviewStats(): Promise<OverviewStats> {
  const agent = mastra.getAgentById("assistant-agent");
  const memory = await agent.getMemory();
  const threadsResult = memory
    ? await memory.listThreads({ page: 0, perPage: 1 }).catch((error) => {
        console.error("[admin] listThreads failed:", error);
        return null;
      })
    : null;

  const totalMessages = await safeCount(prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM mastra_messages
  `);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const tracesLast24h = await safeCount(prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM mastra_span_events
    WHERE "parentSpanId" IS NULL AND "startedAt" >= ${since}
  `);

  const errorsLast24h = await safeCount(prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM mastra_span_events
    WHERE "parentSpanId" IS NULL AND "startedAt" >= ${since} AND "error" IS NOT NULL
  `);

  const avgLatencyMsLast24h = await prisma.$queryRaw<{ avg_latency: number | null }[]>`
    SELECT AVG(EXTRACT(EPOCH FROM ("endedAt" - "startedAt")) * 1000) AS avg_latency
    FROM mastra_span_events
    WHERE "parentSpanId" IS NULL AND "startedAt" >= ${since} AND "endedAt" IS NOT NULL
  `
    .then(([row]) => (row.avg_latency === null ? null : Math.round(row.avg_latency)))
    .catch((error) => {
      console.error("[admin] avg latency query failed:", error);
      return null;
    });

  const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const runsByDay = await prisma.$queryRaw<{ day: string; success: bigint; error: bigint }[]>`
    SELECT
      TO_CHAR(DATE_TRUNC('day', "startedAt"), 'YYYY-MM-DD') AS day,
      COUNT(*) FILTER (WHERE "error" IS NULL)::bigint AS success,
      COUNT(*) FILTER (WHERE "error" IS NOT NULL)::bigint AS error
    FROM mastra_span_events
    WHERE "parentSpanId" IS NULL AND "startedAt" >= ${since14d}
    GROUP BY 1
    ORDER BY 1 ASC
  `
    .then((rows) => rows.map((r) => ({ day: r.day, success: Number(r.success), error: Number(r.error) })))
    .catch((error) => {
      console.error("[admin] runs-by-day query failed:", error);
      return [];
    });

  const since1h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const runsByHour = await prisma.$queryRaw<{ hour: string; success: bigint; error: bigint }[]>`
    SELECT
      TO_CHAR(DATE_TRUNC('hour', "startedAt"), 'YYYY-MM-DD HH24:00') AS hour,
      COUNT(*) FILTER (WHERE "error" IS NULL)::bigint AS success,
      COUNT(*) FILTER (WHERE "error" IS NOT NULL)::bigint AS error
    FROM mastra_span_events
    WHERE "parentSpanId" IS NULL AND "startedAt" >= ${since1h}
    GROUP BY 1
    ORDER BY 1 ASC
  `
    .then((rows) => rows.map((r) => ({ hour: r.hour, success: Number(r.success), error: Number(r.error) })))
    .catch((error) => {
      console.error("[admin] runs-by-hour query failed:", error);
      return [];
    });

  const modelUsage = await prisma.$queryRaw<{ model: string | null; count: bigint }[]>`
    SELECT
      "requestContext"->>'model' AS model,
      COUNT(*)::bigint AS count
    FROM mastra_span_events
    WHERE "parentSpanId" IS NULL AND "startedAt" >= ${since}
    GROUP BY 1
    ORDER BY count DESC
    LIMIT 10
  `
    .then((rows) =>
      rows
        .map((r) => ({ model: r.model ?? "unknown", count: Number(r.count) }))
        .filter((r) => r.model !== "unknown")
    )
    .catch((error) => {
      console.error("[admin] model-usage query failed:", error);
      return [];
    });

  const statusCounts = await prisma.$queryRaw<{ success: bigint; error: bigint }[]>`
    SELECT
      COUNT(*) FILTER (WHERE "error" IS NULL)::bigint AS success,
      COUNT(*) FILTER (WHERE "error" IS NOT NULL)::bigint AS error
    FROM mastra_span_events
    WHERE "parentSpanId" IS NULL AND "startedAt" >= ${since}
  `
    .then(([row]) => ({ success: Number(row?.success ?? 0), error: Number(row?.error ?? 0) }))
    .catch((error) => {
      console.error("[admin] status-counts query failed:", error);
      return { success: 0, error: 0 };
    });

  const latencyTrend = await prisma.$queryRaw<{ day: string; avg_latency: number | null }[]>`
    SELECT
      TO_CHAR(DATE_TRUNC('day', "startedAt"), 'YYYY-MM-DD') AS day,
      AVG(EXTRACT(EPOCH FROM ("endedAt" - "startedAt")) * 1000) AS avg_latency
    FROM mastra_span_events
    WHERE "parentSpanId" IS NULL AND "startedAt" >= ${since14d} AND "endedAt" IS NOT NULL
    GROUP BY 1
    ORDER BY 1 ASC
  `
    .then((rows) =>
      rows
        .map((r) => ({ day: r.day, avgLatencyMs: r.avg_latency === null ? 0 : Math.round(r.avg_latency) }))
    )
    .catch((error) => {
      console.error("[admin] latency-trend query failed:", error);
      return [];
    });

  const messagesByDay = await prisma.$queryRaw<{ day: string; count: bigint }[]>`
    SELECT
      TO_CHAR(DATE_TRUNC('day', "createdAt"), 'YYYY-MM-DD') AS day,
      COUNT(*)::bigint AS count
    FROM mastra_messages
    WHERE "createdAt" >= ${since14d}
    GROUP BY 1
    ORDER BY 1 ASC
  `
    .then((rows) => rows.map((r) => ({ day: r.day, count: Number(r.count) })))
    .catch((error) => {
      console.error("[admin] messages-by-day query failed:", error);
      return [];
    });

  return {
    totalConversations: threadsResult?.total ?? null,
    totalMessages,
    tracesLast24h,
    errorsLast24h,
    avgLatencyMsLast24h,
    runsByDay,
    runsByHour,
    modelUsage,
    statusCounts,
    latencyTrend,
    messagesByDay,
  };
}
