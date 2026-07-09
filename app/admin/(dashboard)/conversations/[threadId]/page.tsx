import Link from "next/link";
import { notFound } from "next/navigation";
import { mastra } from "@/mastra";

/**
 * `MastraDBMessage.content` is never a bare string — it's always the
 * structured `MastraMessageContentV2` shape: `{ format: 2, parts: [...], ... }`.
 * (The Chat feature's own UI avoids this entirely by converting through
 * `toAISdkV5Messages`; this admin viewer renders the raw DB message instead.)
 * Pull the human-readable text out of the `parts` array when present, and
 * fall back to a JSON dump for anything else (tool calls, reasoning, etc.).
 */
function renderMessageContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (content && typeof content === "object" && "parts" in content && Array.isArray(content.parts)) {
    const text = content.parts
      .filter(
        (part): part is { type: "text"; text: string } =>
          !!part && typeof part === "object" && part.type === "text" && typeof part.text === "string"
      )
      .map((part) => part.text)
      .join("");
    if (text) {
      return text;
    }
  }

  return JSON.stringify(content, null, 2);
}

export default async function AdminConversationDetailPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;

  const agent = mastra.getAgentById("assistant-agent");
  const memory = await agent.getMemory();
  if (!memory) {
    notFound();
  }

  const thread = await memory.getThreadById({ threadId });
  if (!thread) {
    notFound();
  }

  const { messages } = await memory.recall({ threadId, resourceId: thread.resourceId });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link className="text-muted-foreground text-sm underline underline-offset-2" href="/admin/conversations">
          ← All conversations
        </Link>
      </div>
      <h1 className="font-medium text-lg">{thread.title?.trim() || "New chat"}</h1>
      <p className="text-muted-foreground text-sm">Resource: {thread.resourceId}</p>
      <div className="flex flex-col gap-3">
        {messages.map((message) => (
          <div className="rounded-md border p-3 text-sm" key={message.id}>
            <div className="mb-1 font-medium text-muted-foreground text-xs uppercase">{message.role}</div>
            <pre className="whitespace-pre-wrap">{renderMessageContent(message.content)}</pre>
          </div>
        ))}
        {messages.length === 0 && <p className="text-muted-foreground text-sm">No messages in this conversation.</p>}
      </div>
    </div>
  );
}
