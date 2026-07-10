import { notFound, redirect } from "next/navigation";
import { toAISdkV5Messages } from "@mastra/ai-sdk/ui";
import { ChatView } from "@/components/chat/chat-view";
import { requireUser } from "@/lib/session";
import { mastra } from "@/mastra";
import { getPersona } from "@/mastra/personas";
import { getThreadPersonaId, resolveAgentId } from "@/mastra/agent-resolver";

export default async function CharacterChatPage({
  params,
}: {
  params: Promise<{ personaId: string; threadId?: string[] }>;
}) {
  const { personaId, threadId: threadIdSegments } = await params;
  const persona = getPersona(personaId);
  if (!persona) {
    notFound();
  }
  const threadId = threadIdSegments?.[0];

  if (!threadId) {
    return (
      <div className="flex h-[calc(100vh-6rem)] flex-col">
        <ChatView persona={persona} />
      </div>
    );
  }

  const user = await requireUser();
  const registryAgent = mastra.getAgentById("assistant-agent");
  const registryMemory = await registryAgent.getMemory();
  if (!registryMemory) {
    notFound();
  }

  const thread = await registryMemory.getThreadById({ threadId });
  if (!thread || thread.resourceId !== user.id) {
    notFound();
  }

  const threadPersonaId = getThreadPersonaId(thread);
  if (threadPersonaId !== persona.id) {
    redirect(threadPersonaId ? `/characters/${threadPersonaId}/${threadId}` : `/chat/${threadId}`);
  }

  const agent = mastra.getAgentById(resolveAgentId(persona.id));
  const memory = await agent.getMemory();
  if (!memory) {
    notFound();
  }
  const { messages } = await memory.recall({ threadId, resourceId: user.id });

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      <ChatView initialMessages={toAISdkV5Messages(messages)} persona={persona} threadId={threadId} />
    </div>
  );
}
