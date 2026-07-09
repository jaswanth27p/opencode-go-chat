import "server-only";
import { prisma } from "@/lib/prisma";
import { mastra } from "@/mastra";

export type OverviewStats = {
  totalConversations: number;
  totalMessages: number;
  tracesLast24h: number;
  errorsLast24h: number;
  avgLatencyMsLast24h: number | null;
  runsByDay: { day: string; success: number; error: number }[];
};

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
  const threadsResult = memory ? await memory.listThreads({ page: 0, perPage: 1 }) : null;

  const [{ count: totalMessages }] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM mastra_messages
  `;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [{ count: tracesLast24h }] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM mastra_ai_spans
    WHERE "parentSpanId" IS NULL AND "startedAt" >= ${since}
  `;

  const [{ count: errorsLast24h }] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM mastra_ai_spans
    WHERE "parentSpanId" IS NULL AND "startedAt" >= ${since} AND "error" IS NOT NULL
  `;

  const [{ avg_latency: avgLatency }] = await prisma.$queryRaw<{ avg_latency: number | null }[]>`
    SELECT AVG(EXTRACT(EPOCH FROM ("endedAt" - "startedAt")) * 1000) AS avg_latency
    FROM mastra_ai_spans
    WHERE "parentSpanId" IS NULL AND "startedAt" >= ${since} AND "endedAt" IS NOT NULL
  `;

  const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const runsByDayRows = await prisma.$queryRaw<{ day: string; success: bigint; error: bigint }[]>`
    SELECT
      TO_CHAR(DATE_TRUNC('day', "startedAt"), 'YYYY-MM-DD') AS day,
      COUNT(*) FILTER (WHERE "error" IS NULL)::bigint AS success,
      COUNT(*) FILTER (WHERE "error" IS NOT NULL)::bigint AS error
    FROM mastra_ai_spans
    WHERE "parentSpanId" IS NULL AND "startedAt" >= ${since14d}
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  return {
    totalConversations: threadsResult?.total ?? 0,
    totalMessages: Number(totalMessages),
    tracesLast24h: Number(tracesLast24h),
    errorsLast24h: Number(errorsLast24h),
    avgLatencyMsLast24h: avgLatency === null ? null : Math.round(avgLatency),
    runsByDay: runsByDayRows.map((r) => ({
      day: r.day,
      success: Number(r.success),
      error: Number(r.error),
    })),
  };
}
