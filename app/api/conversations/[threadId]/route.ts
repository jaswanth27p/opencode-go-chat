import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { mastra } from "@/mastra";

const STORAGE_ERROR = { error: "Couldn't reach the conversation store. Try again shortly." };

async function getOwnedThread(threadId: string, userId: string) {
  const agent = mastra.getAgentById("assistant-agent");
  const memory = await agent.getMemory();
  if (!memory) {
    return { memory: null, thread: null, storageError: false };
  }
  try {
    const thread = await memory.getThreadById({ threadId });
    if (!thread || thread.resourceId !== userId) {
      return { memory, thread: null, storageError: false };
    }
    return { memory, thread, storageError: false };
  } catch (error) {
    console.error("[conversations] Failed to load thread", error);
    return { memory, thread: null, storageError: true };
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const user = await requireUser();
  const { threadId } = await params;
  const { memory, thread, storageError } = await getOwnedThread(threadId, user.id);
  if (storageError) {
    return NextResponse.json(STORAGE_ERROR, { status: 502 });
  }
  if (!memory || !thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  try {
    const updated = await memory.updateThread({
      id: threadId,
      title,
      metadata: thread.metadata ?? {},
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[conversations] Failed to update thread", error);
    return NextResponse.json(STORAGE_ERROR, { status: 502 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const user = await requireUser();
  const { threadId } = await params;
  const { memory, thread, storageError } = await getOwnedThread(threadId, user.id);
  if (storageError) {
    return NextResponse.json(STORAGE_ERROR, { status: 502 });
  }
  if (!memory || !thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await memory.deleteThread(threadId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[conversations] Failed to delete thread", error);
    return NextResponse.json(STORAGE_ERROR, { status: 502 });
  }
}
