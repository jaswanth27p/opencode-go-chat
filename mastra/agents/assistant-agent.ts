import { Agent } from "@mastra/core/agent";
import { PIIDetector, StreamErrorRetryProcessor } from "@mastra/core/processors";
import { Memory } from "@mastra/memory";
import { DEFAULT_MODEL } from "../models";

export const assistantAgent = new Agent({
  id: "assistant-agent",
  name: "Assistant",
  instructions: "You are a helpful, concise assistant.",
  model: ({ requestContext }) => {
    const selected = (requestContext.get("model") as string | undefined) ?? DEFAULT_MODEL;
    if (selected === DEFAULT_MODEL) {
      return selected;
    }
    return [
      { id: "selected", model: selected, maxRetries: 1 },
      { id: "fallback-default", model: DEFAULT_MODEL, maxRetries: 1 },
    ];
  },
  maxRetries: 2,
  memory: new Memory({
    options: {
      lastMessages: 20,
      generateTitle: {
        model: DEFAULT_MODEL,
        instructions:
          "Generate a short 3-6 word title summarizing this conversation. No punctuation at the end, no quotes.",
      },
    },
  }),
  inputProcessors: [
    new PIIDetector({
      model: DEFAULT_MODEL,
      strategy: "redact",
      detectionTypes: ["email", "phone", "credit-card"],
    }),
  ],
  errorProcessors: [
    new StreamErrorRetryProcessor({
      maxRetries: 2,
      delayMs: ({ retryCount }) => Math.min(500 * 2 ** retryCount, 5000),
    }),
  ],
});
