import { z } from "zod";

const textPartSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const filePartSchema = z.object({
  type: z.literal("file"),
  url: z.string().optional(),
  mediaType: z.string().optional(),
  filename: z.string().optional(),
});

const uiMessagePartSchema = z.union([textPartSchema, filePartSchema]);

const uiMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  parts: z.array(uiMessagePartSchema),
  createdAt: z.union([z.string(), z.date(), z.number()]).optional(),
});

export const chatBodySchema = z.object({
  model: z.string().optional(),
  messages: z.array(uiMessageSchema),
});

export type ChatBody = z.infer<typeof chatBodySchema>;
