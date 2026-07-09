import { RequestContext } from "@mastra/core/request-context";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";
import { mastra } from "@/mastra";
import { DEFAULT_MODEL } from "@/mastra/models";

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
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return new Response("prompt is required", { status: 400 });
  }

  const modelId = typeof body.model === "string" ? body.model : DEFAULT_MODEL;
  const requestContext = new RequestContext();
  requestContext.set("model", modelId);

  const modelSettings: Record<string, unknown> = {};
  if (typeof body.temperature === "number") modelSettings.temperature = body.temperature;
  if (typeof body.maxOutputTokens === "number") modelSettings.maxOutputTokens = body.maxOutputTokens;
  if (typeof body.topP === "number") modelSettings.topP = body.topP;
  if (typeof body.topK === "number") modelSettings.topK = body.topK;
  if (typeof body.presencePenalty === "number") modelSettings.presencePenalty = body.presencePenalty;
  if (typeof body.frequencyPenalty === "number") modelSettings.frequencyPenalty = body.frequencyPenalty;
  if (typeof body.seed === "number") modelSettings.seed = body.seed;
  if (typeof body.stopSequences === "string" && body.stopSequences.trim()) {
    modelSettings.stopSequences = body.stopSequences
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
  }

  const agent = mastra.getAgentById("assistant-agent");

  try {
    const result = await agent.stream(prompt, {
      instructions:
        typeof body.systemPrompt === "string" && body.systemPrompt.trim()
          ? body.systemPrompt
          : undefined,
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
