import { Mastra } from "@mastra/core";
import { PostgresStore } from "@mastra/pg";
import { assistantAgent } from "./agents/assistant-agent";

export const mastra = new Mastra({
  storage: new PostgresStore({
    id: "mastra-storage",
    connectionString: process.env.DATABASE_URL as string,
  }),
  agents: { assistantAgent },
});
