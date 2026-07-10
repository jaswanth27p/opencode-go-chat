import { PERSONAS } from "../personas";
import { createChatAgent } from "./shared";

export const personaAgents = Object.fromEntries(
  PERSONAS.map((persona) => [
    persona.id,
    createChatAgent({
      id: `persona-${persona.id}`,
      name: persona.name,
      instructions: persona.instructions,
    }),
  ])
);
