import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { mastra } from "@/mastra";

async function getOwnedThread(threadId: string, userId: string) {
  const agent = mastra.getAgentById("assistant-agent");
  const memory = await agent.getMemory();
  if (!memory) {
    return { memory: null, thread: null };
  }
  const thread = await memory.getThreadById({ threadId });
  if (!thread || thread.resourceId !== userId) {
    return { memory, thread: null };
  }
  return { memory, thread };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const user = await requireUser();
  const { threadId } = await params;
  const { memory, thread } = await getOwnedThread(threadId, user.id);
  if (!memory || !thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const updated = await memory.updateThread({
    id: threadId,
    title,
    metadata: thread.metadata ?? {},
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const user = await requireUser();
  const { threadId } = await params;
  const { memory, thread } = await getOwnedThread(threadId, user.id);
  if (!memory || !thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await memory.deleteThread(threadId);
  return NextResponse.json({ ok: true });
}
