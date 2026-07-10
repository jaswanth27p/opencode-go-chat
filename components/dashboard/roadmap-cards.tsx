import { Database, Globe, Plug, Workflow } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ROADMAP = [
  {
    title: "RAG & Projects",
    description:
      "One-shot chat with uploaded PDFs, docs, text and images. Projects let you upload a set of files and chat and search across them, with reranking, query rewriting and hybrid search.",
    icon: Database,
  },
  {
    title: "Website & docs chat",
    description: "Point at a site or docs set and chat with it directly.",
    icon: Globe,
  },
  {
    title: "MCP-connected characters",
    description: "Selected personas get live MCP tool connections instead of just a system prompt.",
    icon: Plug,
  },
  {
    title: "Workflow features",
    description: "A couple of multi-step, workflow-driven features built on top of the agent layer.",
    icon: Workflow,
  },
];

export function RoadmapCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {ROADMAP.map((item) => (
        <Card className="flex flex-col border-dashed bg-muted/40" key={item.title}>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <item.icon className="size-5 text-muted-foreground" />
                <CardTitle className="text-base">{item.title}</CardTitle>
              </div>
              <Badge variant="outline">Planned</Badge>
            </div>
            <CardDescription>{item.description}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
