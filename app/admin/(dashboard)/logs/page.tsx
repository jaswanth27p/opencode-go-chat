import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getObservabilityStore } from "@/lib/admin/observability";

const PAGE_SIZE = 50;
const LEVELS = ["error", "warn", "info", "debug", "fatal"] as const;

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; level?: string }>;
}) {
  const { page: pageParam, level } = await searchParams;
  const page = Math.max(0, Number(pageParam ?? "0") || 0);
  const selectedLevel = LEVELS.includes(level as (typeof LEVELS)[number])
    ? (level as (typeof LEVELS)[number])
    : undefined;

  const observability = await getObservabilityStore();
  let result: Awaited<ReturnType<NonNullable<typeof observability>["listLogs"]>> | null = null;
  let logsUnavailable = false;
  if (observability) {
    try {
      result = await observability.listLogs({
        filters: selectedLevel ? { level: selectedLevel } : undefined,
        pagination: { page, perPage: PAGE_SIZE },
      });
    } catch {
      // Some storage backends (e.g. the Postgres observability store) don't implement
      // log listing yet — degrade gracefully instead of throwing a 500.
      logsUnavailable = true;
    }
  }

  const logs = result?.logs ?? [];
  const pagination = result?.pagination;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-medium text-lg">Logs</h1>
      <p className="text-muted-foreground text-sm">
        Logs are forwarded from Mastra when observability logging is enabled. New logs may take a few seconds to appear.
      </p>
      {!observability && (
        <p className="text-muted-foreground text-sm">Observability storage is not configured.</p>
      )}
      {logsUnavailable && (
        <p className="text-muted-foreground text-sm">
          This storage provider does not support listing logs yet.
        </p>
      )}
      <div className="flex flex-wrap gap-2 text-muted-foreground text-xs">
        {LEVELS.map((lvl) => (
          <Link
            className={`rounded px-2 py-1 ${selectedLevel === lvl ? "bg-muted font-medium text-foreground" : ""}`}
            href={`/admin/logs?level=${lvl}`}
            key={lvl}
          >
            {lvl}
          </Link>
        ))}
        <Link className={`rounded px-2 py-1 ${!selectedLevel ? "bg-muted font-medium text-foreground" : ""}`} href="/admin/logs">
          all
        </Link>
      </div>
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-2">Level</th>
              <th className="p-2">Message</th>
              <th className="p-2">Entity</th>
              <th className="p-2">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr className="border-t align-top" key={`${log.timestamp}-${i}`}>
                <td className="p-2">
                  <Badge variant={log.level === "error" || log.level === "fatal" ? "destructive" : "secondary"}>
                    {log.level}
                  </Badge>
                </td>
                <td className="max-w-md truncate p-2" title={log.message}>
                  {log.message}
                </td>
                <td className="p-2">{log.entityName ?? "—"}</td>
                <td className="p-2">{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={4}>
                  No logs recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pagination && (
        <div className="flex items-center justify-between text-muted-foreground text-sm">
          <Link
            aria-disabled={page === 0}
            className={page === 0 ? "pointer-events-none opacity-50" : "underline"}
            href={`/admin/logs?page=${Math.max(0, page - 1)}${selectedLevel ? `&level=${selectedLevel}` : ""}`}
          >
            Previous
          </Link>
          <span>
            Page {pagination.page + 1} · {pagination.total} total
          </span>
          <Link
            aria-disabled={!pagination.hasMore}
            className={!pagination.hasMore ? "pointer-events-none opacity-50" : "underline"}
            href={`/admin/logs?page=${page + 1}${selectedLevel ? `&level=${selectedLevel}` : ""}`}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
