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
    FROM mastra_ai_spans
    WHERE "parentSpanId" IS NULL AND "startedAt" >= ${since}
  `);

  const errorsLast24h = await safeCount(prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM mastra_ai_spans
    WHERE "parentSpanId" IS NULL AND "startedAt" >= ${since} AND "error" IS NOT NULL
  `);

  const avgLatencyMsLast24h = await prisma.$queryRaw<{ avg_latency: number | null }[]>`
    SELECT AVG(EXTRACT(EPOCH FROM ("endedAt" - "startedAt")) * 1000) AS avg_latency
    FROM mastra_ai_spans
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
    FROM mastra_ai_spans
    WHERE "parentSpanId" IS NULL AND "startedAt" >= ${since14d}
    GROUP BY 1
    ORDER BY 1 ASC
  `
    .then((rows) => rows.map((r) => ({ day: r.day, success: Number(r.success), error: Number(r.error) })))
    .catch((error) => {
      console.error("[admin] runs-by-day query failed:", error);
      return [];
    });

  return {
    totalConversations: threadsResult?.total ?? null,
    totalMessages,
    tracesLast24h,
    errorsLast24h,
    avgLatencyMsLast24h,
    runsByDay,
  };
}
