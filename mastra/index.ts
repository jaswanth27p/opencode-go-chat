import { Mastra } from "@mastra/core";
import { PostgresStore } from "@mastra/pg";
import { Observability, MastraStorageExporter } from "@mastra/observability";
import { assistantAgent } from "./agents/assistant-agent";

export const mastra = new Mastra({
  storage: new PostgresStore({
    id: "mastra-storage",
    connectionString: process.env.DATABASE_URL as string,
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "opencode-go-chat",
        exporters: [new MastraStorageExporter()],
      },
    },
  }),
  agents: { assistantAgent },
});
