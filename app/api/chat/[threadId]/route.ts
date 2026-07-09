import { handleChatStream } from "@mastra/ai-sdk";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import { NextResponse } from "next/server";
import { RequestContext } from "@mastra/core/request-context";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";
import { mastra } from "@/mastra";
import { chatBodySchema } from "@/lib/validations/chat";
import {
  DEFAULT_MODEL,
  getModel,
  sanitizeMessagesForModel,
} from "@/mastra/models";

type Modality = "image" | "audio" | "video";

function blockedModality(
  message: UIMessage | undefined,
  model: ReturnType<typeof getModel>
): Modality | null {
  if (!message) {
    return null;
  }
  for (const part of message.parts) {
    if (part.type !== "file") {
      continue;
    }
    const mediaType = part.mediaType ?? "";
    if (mediaType.startsWith("image/") && !model.supportsImage) {
      return "image";
    }
    if (mediaType.startsWith("audio/") && !model.supportsAudio) {
      return "audio";
    }
    if (mediaType.startsWith("video/") && !model.supportsVideo) {
      return "video";
    }
  }
  return null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const user = await requireUser();
  const rateLimit = await checkRateLimit(user.id, "chat");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(rateLimit.resetSeconds) } }
    );
  }
  const { threadId } = await params;

  const agent = mastra.getAgentById("assistant-agent");
  const memory = await agent.getMemory();
  if (!memory) {
    return NextResponse.json({ error: "Memory not configured" }, { status: 500 });
  }

  let thread;
  try {
    thread = await memory.getThreadById({ threadId });
  } catch (error) {
    console.error("[chat] Failed to load thread", error);
    return NextResponse.json(
      { error: "Couldn't reach the conversation store. Try again shortly." },
      { status: 502 }
    );
  }
  if (!thread || thread.resourceId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parseResult = chatBodySchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }
  const messages = parseResult.data.messages as UIMessage[];
  const modelId = parseResult.data.model ?? DEFAULT_MODEL;
  const model = getModel(modelId);

  const sanitizedMessages = sanitizeMessagesForModel(messages, model);

  const lastUserMessage = [...sanitizedMessages]
    .reverse()
    .find((m) => m.role === "user");
  const blocked = blockedModality(lastUserMessage, model);

  if (blocked) {
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const id = "blocked-modality";
        writer.write({ type: "text-start", id });
        writer.write({
          type: "text-delta",
          id,
          delta: `${model.label} can't read ${blocked} attachments. Remove it or switch to a different model.`,
        });
        writer.write({ type: "text-end", id });
      },
    });
    return createUIMessageStreamResponse({ stream });
  }

  const requestContext = new RequestContext();
  requestContext.set("model", modelId);

  const handleChatError = (error: unknown): string => {
    console.error("[chat]", error);
    return "Something went wrong talking to the model. Try again or pick a different model.";
  };

  const buildMessageMetadata = ({
    part,
  }: {
    part: { type: string; totalUsage?: unknown };
  }) => {
    if (part.type === "finish") {
      return { model: modelId, usage: part.totalUsage };
    }
  };

  // `@mastra/ai-sdk` (1.6.1) ships its own vendored snapshot of the AI SDK
  // v5/v6 UI message & stream-chunk types (`@internal/ai-sdk-v5` and
  // `@internal/ai-v6`), which don't structurally match the `ai` package
  // actually installed in this project (`ai@7.0.16`): it adds a `custom`
  // UIMessagePart variant neither vendored snapshot has, uses a different
  // `ProviderMetadata` shape, and widens `finishReason` to include
  // `"unknown"`. At runtime both sides exchange the same AI SDK UI-message
  // JSON; only the two packages' independently generated `.d.ts` snapshots
  // disagree. `onError` and `messageMetadata` are declared above with
  // explicit types so our own logic stays type-checked; only this call's
  // argument and its return value cross the mismatched boundary.
  const chatStream = (await handleChatStream({
    mastra,
    agentId: "assistant-agent",
    params: {
      messages: sanitizedMessages,
      memory: { thread: threadId, resource: user.id },
      requestContext,
    },
    onError: handleChatError,
    messageMetadata: buildMessageMetadata,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- bridges vendored type-declaration skew, see comment above
  } as any)) as unknown as ReadableStream<UIMessageChunk>;

  return createUIMessageStreamResponse({ stream: chatStream });
}
