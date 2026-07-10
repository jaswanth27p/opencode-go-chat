export function DashboardHero() {
  return (
    <div className="flex flex-col gap-2 border-b pb-6">
      <h1 className="text-3xl font-semibold tracking-tight">AI Lab</h1>
      <p className="max-w-2xl text-muted-foreground text-sm">
        A proof-of-work project for practical AI engineering — chat, persona agents, and a
        model playground today; RAG, agentic workflows, and MCP-connected tools next.
      </p>
    </div>
  );
}
