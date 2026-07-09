import { notFound } from "next/navigation";
import { toAISdkV5Messages } from "@mastra/ai-sdk/ui";
import { ChatView } from "@/components/chat/chat-view";
import { requireUser } from "@/lib/session";
import { mastra } from "@/mastra";

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const user = await requireUser();
  const { threadId } = await params;

  const agent = mastra.getAgentById("assistant-agent");
  const memory = await agent.getMemory();
  if (!memory) {
    notFound();
  }

  const thread = await memory.getThreadById({ threadId });
  if (!thread || thread.resourceId !== user.id) {
    notFound();
  }

  const { messages } = await memory.recall({ threadId, resourceId: user.id });

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      <ChatView initialMessages={toAISdkV5Messages(messages)} threadId={threadId} />
    </div>
  );
}
