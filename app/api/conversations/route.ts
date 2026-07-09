import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { mastra } from "@/mastra";

const PAGE_SIZE = 20;

export async function POST() {
  const user = await requireUser();
  const agent = mastra.getAgentById("assistant-agent");
  const memory = await agent.getMemory();
  if (!memory) {
    return NextResponse.json({ error: "Memory not configured" }, { status: 500 });
  }

  try {
    const thread = await memory.createThread({ resourceId: user.id });
    return NextResponse.json({ id: thread.id });
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
  const agent = mastra.getAgentById("assistant-agent");
  const memory = await agent.getMemory();
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
