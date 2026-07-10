import { notFound, redirect } from "next/navigation";
import { toAISdkV5Messages } from "@mastra/ai-sdk/ui";
import { ChatView } from "@/components/chat/chat-view";
import { requireUser } from "@/lib/session";
import { mastra } from "@/mastra";
import { getThreadPersonaId } from "@/mastra/agent-resolver";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ threadId?: string[] }>;
}) {
  const { threadId: threadIdSegments } = await params;
  const threadId = threadIdSegments?.[0];

  if (!threadId) {
    return (
      <div className="flex h-[calc(100vh-6rem)] flex-col">
        <ChatView key="new" />
      </div>
    );
  }

  const user = await requireUser();
  const registryAgent = mastra.getAgentById("assistant-agent");
  const memory = await registryAgent.getMemory();
  if (!memory) {
    notFound();
  }

  const thread = await memory.getThreadById({ threadId });
  if (!thread || thread.resourceId !== user.id) {
    notFound();
  }

  const personaId = getThreadPersonaId(thread);
  if (personaId) {
    redirect(`/characters/${personaId}/${threadId}`);
  }

  const { messages } = await memory.recall({ threadId, resourceId: user.id });

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      <ChatView key={threadId} initialMessages={toAISdkV5Messages(messages)} threadId={threadId} />
    </div>
  );
}
