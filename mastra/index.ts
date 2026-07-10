import { Mastra } from "@mastra/core";
import { PostgresStoreVNext } from "@mastra/pg";
import { createLogger } from "@mastra/core/logger";
import { Observability, MastraStorageExporter } from "@mastra/observability";
import { assistantAgent } from "./agents/assistant-agent";
import { personaAgents } from "./agents/persona-agents";

export const mastra = new Mastra({
  storage: new PostgresStoreVNext({
    id: "mastra-storage",
    connectionString: process.env.DATABASE_URL as string,
    observability: {
      connectionString: process.env.DATABASE_URL as string,
    },
  }),
  logger: createLogger({ name: "opencode-go-chat", level: "info" }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "opencode-go-chat",
        exporters: [new MastraStorageExporter()],
        logging: {
          enabled: true,
          level: "info",
        },
      },
    },
  }),
  agents: { assistantAgent, ...personaAgents },
});
