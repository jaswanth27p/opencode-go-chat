import { notFound } from "next/navigation";
import { SpanTree } from "@/components/admin/span-tree";
import { getObservabilityStore } from "@/lib/admin/observability";

export default async function AdminTraceDetailPage({
  params,
}: {
  params: Promise<{ traceId: string }>;
}) {
  const { traceId } = await params;
  const observability = await getObservabilityStore();
  if (!observability) {
    notFound();
  }

  const trace = await observability.getTrace({ traceId });
  if (!trace) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-medium text-lg">Trace {traceId}</h1>
      <div className="rounded-md border p-2">
        <SpanTree spans={trace.spans} />
      </div>
    </div>
  );
}
