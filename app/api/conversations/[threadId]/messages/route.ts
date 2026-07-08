import { NextResponse } from "next/server";
import { toAISdkV5Messages } from "@mastra/ai-sdk/ui";
import { requireUser } from "@/lib/session";
import { mastra } from "@/mastra";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const user = await requireUser();
  const { threadId } = await params;

  const agent = mastra.getAgentById("assistant-agent");
  const memory = await agent.getMemory();
  if (!memory) {
    return NextResponse.json({ messages: [] });
  }

  const thread = await memory.getThreadById({ threadId });
  if (!thread || thread.resourceId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { messages } = await memory.recall({ threadId, resourceId: user.id });
  return NextResponse.json({ messages: toAISdkV5Messages(messages) });
}
