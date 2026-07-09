import { RequestContext } from "@mastra/core/request-context";
import { checkRateLimit } from "@/lib/rate-limit";
import { playgroundInputSchema } from "@/lib/validations/playground";
import { requireUser } from "@/lib/session";
import { mastra } from "@/mastra";

const USAGE_MARKER = "\n\n<<usage>>";

export async function POST(req: Request) {
  const user = await requireUser();
  const rateLimit = await checkRateLimit(user.id, "playground");
  if (!rateLimit.allowed) {
    return new Response("Rate limit exceeded. Try again shortly.", {
      status: 429,
      headers: { "Retry-After": String(rateLimit.resetSeconds), "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const body = await req.json();
  const parseResult = playgroundInputSchema.safeParse(body);
  if (!parseResult.success) {
    return new Response(parseResult.error.issues[0]?.message ?? "Invalid input", { status: 400 });
  }

  const {
    prompt,
    model: modelId,
    systemPrompt,
    temperature,
    maxTokens,
    topP,
    topK,
    presencePenalty,
    frequencyPenalty,
    seed,
    stopSequences,
  } = parseResult.data;

  const requestContext = new RequestContext();
  requestContext.set("model", modelId);

  const modelSettings: Record<string, unknown> = {};
  if (temperature !== undefined) modelSettings.temperature = temperature;
  // The form label says "Max output tokens" and the schema exposes `maxTokens`,
  // but Mastra's `agent.stream` modelSettings expects the AI SDK v5 key
  // `maxOutputTokens`.
  if (maxTokens !== undefined) modelSettings.maxOutputTokens = maxTokens;
  if (topP !== undefined) modelSettings.topP = topP;
  if (topK !== undefined) modelSettings.topK = topK;
  if (presencePenalty !== undefined) modelSettings.presencePenalty = presencePenalty;
  if (frequencyPenalty !== undefined) modelSettings.frequencyPenalty = frequencyPenalty;
  if (seed !== undefined) modelSettings.seed = seed;
  if (stopSequences?.trim()) {
    modelSettings.stopSequences = stopSequences
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const agent = mastra.getAgentById("assistant-agent");

  try {
    const result = await agent.stream(prompt, {
      instructions: systemPrompt?.trim() ? systemPrompt : undefined,
      requestContext,
      modelSettings,
    });

    // Mastra's agent.stream() doesn't reject on model/provider failures (e.g.
    // an invalid API key) — it logs internally and resolves an empty
    // textStream with `result.error` set. Peek the first chunk before
    // committing to a 200 response so a failure that occurs before any
    // output can still be reported as a proper 502 instead of silently
    // streaming an empty body.
    const reader = result.textStream.getReader();
    const first = await reader.read();

    if (result.error) {
      console.error("[playground]", result.error);
      return new Response(
        "Something went wrong talking to the model. Try again or pick a different model.",
        { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }

    const encoder = new TextEncoder();
    const bodyStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        if (!first.done) {
          controller.enqueue(encoder.encode(first.value));
        }
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          controller.enqueue(encoder.encode(value));
        }
        if (result.error) {
          console.error("[playground]", result.error);
          controller.enqueue(
            encoder.encode(
              "\n\n[error] Something went wrong talking to the model. Try again or pick a different model."
            )
          );
          controller.close();
          return;
        }
        const usage = await result.usage;
        controller.enqueue(encoder.encode(`${USAGE_MARKER}${JSON.stringify(usage)}`));
        controller.close();
      },
    });

    return new Response(bodyStream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("[playground]", error);
    return new Response(
      "Something went wrong talking to the model. Try again or pick a different model.",
      { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }
}
