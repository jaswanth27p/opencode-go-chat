import { z } from "zod";
import { PERSONAS } from "@/mastra/personas";

const PERSONA_IDS = PERSONAS.map((persona) => persona.id) as [string, ...string[]];

export const createConversationBodySchema = z.object({
  threadId: z.string().min(1, "threadId is required"),
  personaId: z.enum(PERSONA_IDS).optional(),
});

export type CreateConversationBody = z.infer<typeof createConversationBodySchema>;
