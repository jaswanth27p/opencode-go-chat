import { Badge } from "@/components/ui/badge";

type Span = {
  spanId: string;
  parentSpanId?: string | null;
  name: string;
  spanType: string;
  startedAt: Date | string;
  endedAt?: Date | string | null;
  error?: unknown;
  input?: unknown;
  output?: unknown;
  attributes?: Record<string, unknown> | null;
};

function buildTree(spans: Span[]) {
  const bySpanId = new Map(spans.map((s) => [s.spanId, { ...s, children: [] as Span[] }]));
  const roots: (Span & { children: Span[] })[] = [];
  for (const span of bySpanId.values()) {
    if (span.parentSpanId && bySpanId.has(span.parentSpanId)) {
      bySpanId.get(span.parentSpanId)!.children.push(span);
    } else {
      roots.push(span);
    }
  }
  return roots;
}

function SpanNode({ span, depth }: { span: Span & { children: Span[] }; depth: number }) {
  const durationMs = span.endedAt
    ? new Date(span.endedAt).getTime() - new Date(span.startedAt).getTime()
    : null;

  return (
    <div>
      <div
        className="flex items-center gap-2 border-b py-2 text-sm"
        style={{ paddingLeft: depth * 16 }}
      >
        <span className="font-medium">{span.name}</span>
        <Badge variant="outline">{span.spanType}</Badge>
        {span.error ? <Badge variant="destructive">error</Badge> : null}
        <span className="ml-auto text-muted-foreground text-xs">
          {durationMs === null ? "running" : `${durationMs} ms`}
        </span>
      </div>
      {(span.input !== undefined || span.output !== undefined || Boolean(span.error)) && (
        <details className="ml-4 mb-2 text-xs">
          <summary className="cursor-pointer text-muted-foreground">Details</summary>
          <pre className="max-h-64 overflow-auto rounded bg-muted p-2">
            {JSON.stringify({ input: span.input, output: span.output, error: span.error, attributes: span.attributes }, null, 2)}
          </pre>
        </details>
      )}
      {span.children.map((child) => (
        <SpanNode depth={depth + 1} key={child.spanId} span={child as Span & { children: Span[] }} />
      ))}
    </div>
  );
}

export function SpanTree({ spans }: { spans: Span[] }) {
  const roots = buildTree(spans);
  return <div>{roots.map((root) => <SpanNode depth={0} key={root.spanId} span={root} />)}</div>;
}
