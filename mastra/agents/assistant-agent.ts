import { createChatAgent } from "./shared";

export const assistantAgent = createChatAgent({
  id: "assistant-agent",
  name: "Assistant",
  instructions: "You are a helpful, concise assistant.",
});
