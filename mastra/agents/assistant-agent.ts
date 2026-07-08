import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { DEFAULT_MODEL } from "../models";

export const assistantAgent = new Agent({
  id: "assistant-agent",
  name: "Assistant",
  instructions: "You are a helpful, concise assistant.",
  model: ({ requestContext }) =>
    (requestContext.get("model") as string | undefined) ?? DEFAULT_MODEL,
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
});
