import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getObservabilityStore } from "@/lib/admin/observability";

const PAGE_SIZE = 25;

export default async function AdminTracesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Number(pageParam ?? "0") || 0;

  const observability = await getObservabilityStore();
  const result = observability
    ? await observability.listTraces({
        pagination: { page, perPage: PAGE_SIZE },
        orderBy: { field: "startedAt", direction: "DESC" },
      })
    : null;

  const traces = result?.spans ?? [];
  const pagination = result?.pagination;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-medium text-lg">Traces</h1>
      {!observability && (
        <p className="text-muted-foreground text-sm">Observability storage is not configured.</p>
      )}
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-2">Name</th>
              <th className="p-2">Entity</th>
              <th className="p-2">Type</th>
              <th className="p-2">Status</th>
              <th className="p-2">Started</th>
              <th className="p-2">Duration</th>
            </tr>
          </thead>
          <tbody>
            {traces.map((trace) => {
              const durationMs = trace.endedAt
                ? new Date(trace.endedAt).getTime() - new Date(trace.startedAt).getTime()
                : null;
              return (
                <tr className="border-t" key={`${trace.traceId}-${trace.spanId}`}>
                  <td className="p-2">
                    <Link className="underline underline-offset-2" href={`/admin/traces/${trace.traceId}`}>
                      {trace.name}
                    </Link>
                  </td>
                  <td className="p-2">{trace.entityName ?? "—"}</td>
                  <td className="p-2">{trace.spanType}</td>
                  <td className="p-2">
                    <Badge variant={trace.status === "error" ? "destructive" : "secondary"}>
                      {trace.status}
                    </Badge>
                  </td>
                  <td className="p-2">{new Date(trace.startedAt).toLocaleString()}</td>
                  <td className="p-2">{durationMs === null ? "—" : `${durationMs} ms`}</td>
                </tr>
              );
            })}
            {traces.length === 0 && (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={6}>
                  No traces recorded yet.
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
            href={`/admin/traces?page=${Math.max(0, page - 1)}`}
          >
            Previous
          </Link>
          <span>
            Page {pagination.page + 1} · {pagination.total} total
          </span>
          <Link
            aria-disabled={!pagination.hasMore}
            className={!pagination.hasMore ? "pointer-events-none opacity-50" : "underline"}
            href={`/admin/traces?page=${page + 1}`}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
