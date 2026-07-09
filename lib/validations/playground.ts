import { z } from "zod";

export const playgroundInputSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  model: z.string().min(1),
  systemPrompt: z.string().optional(),
  temperature: z.coerce.number().min(0).max(2).optional(),
  maxTokens: z.coerce.number().int().positive().optional(),
  topP: z.coerce.number().min(0).max(1).optional(),
  topK: z.coerce.number().int().min(0).optional(),
  presencePenalty: z.coerce.number().min(-1).max(1).optional(),
  frequencyPenalty: z.coerce.number().min(-1).max(1).optional(),
  seed: z.coerce.number().int().optional(),
  stopSequences: z.string().optional(),
});

export type PlaygroundInput = z.infer<typeof playgroundInputSchema>;
