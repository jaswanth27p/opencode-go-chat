import Link from "next/link";
import { mastra } from "@/mastra";

const PAGE_SIZE = 25;

export default async function AdminConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(0, Number(pageParam ?? "0") || 0);

  const agent = mastra.getAgentById("assistant-agent");
  const memory = await agent.getMemory();
  // Intentionally no `filter` — an admin needs every user's threads, not just
  // the caller's own. `listThreads` only scopes to a resourceId when a filter
  // is passed (see PostgresStore#listThreads), so omitting it entirely returns
  // threads across all resourceIds.
  const result = memory
    ? await memory.listThreads({
        page,
        perPage: PAGE_SIZE,
        orderBy: { field: "updatedAt", direction: "DESC" },
      })
    : null;

  const threads = result?.threads ?? [];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-medium text-lg">Conversations (all users)</h1>
      {!memory && <p className="text-muted-foreground text-sm">Memory is not configured.</p>}
      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-2">Title</th>
              <th className="p-2">Resource (user id)</th>
              <th className="p-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {threads.map((thread) => (
              <tr className="border-t" key={thread.id}>
                <td className="p-2">
                  <Link className="underline underline-offset-2" href={`/admin/conversations/${thread.id}`}>
                    {thread.title?.trim() || "New chat"}
                  </Link>
                </td>
                <td className="p-2">{thread.resourceId}</td>
                <td className="p-2">{new Date(thread.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
            {threads.length === 0 && (
              <tr>
                <td className="p-4 text-center text-muted-foreground" colSpan={3}>
                  No conversations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {result && (
        <div className="flex items-center justify-between text-muted-foreground text-sm">
          <Link
            aria-disabled={page === 0}
            className={page === 0 ? "pointer-events-none opacity-50" : "underline"}
            href={`/admin/conversations?page=${Math.max(0, page - 1)}`}
          >
            Previous
          </Link>
          <span>
            Page {result.page + 1} · {result.total} total
          </span>
          <Link
            aria-disabled={!result.hasMore}
            className={!result.hasMore ? "pointer-events-none opacity-50" : "underline"}
            href={`/admin/conversations?page=${page + 1}`}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
