import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { mastra } from "@/mastra";
import { resolveAgentId } from "@/mastra/agent-resolver";
import { createConversationBodySchema } from "@/lib/validations/conversation";

const PAGE_SIZE = 20;

export async function POST(req: NextRequest) {
  const user = await requireUser();

  const body = await req.json().catch(() => null);
  const parseResult = createConversationBodySchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }
  const { threadId, personaId } = parseResult.data;

  const agent = mastra.getAgentById(resolveAgentId(personaId));
  const memory = await agent.getMemory();
  if (!memory) {
    return NextResponse.json({ error: "Memory not configured" }, { status: 500 });
  }

  try {
    const thread = await memory.createThread({
      threadId,
      resourceId: user.id,
      metadata: personaId ? { personaId } : undefined,
    });
    return NextResponse.json({ id: thread.id, personaId });
  } catch (error) {
    console.error("[conversations] Failed to create thread", error);
    return NextResponse.json(
      { error: "Couldn't reach the conversation store. Try again shortly." },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest) {
  const user = await requireUser();
  // Thread storage is shared across every agent (mastra_threads has no
  // agentId column), so any agent's memory instance can list threads
  // regardless of which agent/persona created them.
  const registryAgent = mastra.getAgentById("assistant-agent");
  const memory = await registryAgent.getMemory();
  if (!memory) {
    return NextResponse.json({ threads: [], total: 0, page: 0, perPage: PAGE_SIZE, hasMore: false });
  }

  const page = Number(req.nextUrl.searchParams.get("page") ?? "0");
  try {
    const result = await memory.listThreads({
      filter: { resourceId: user.id },
      page: Number.isFinite(page) && page >= 0 ? page : 0,
      perPage: PAGE_SIZE,
      orderBy: { field: "updatedAt", direction: "DESC" },
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[conversations] Failed to list threads", error);
    return NextResponse.json(
      { error: "Couldn't reach the conversation store. Try again shortly." },
      { status: 502 }
    );
  }
}
