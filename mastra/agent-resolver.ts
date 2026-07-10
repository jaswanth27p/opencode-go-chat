export function resolveAgentId(personaId?: string | null): string {
  return personaId ? `persona-${personaId}` : "assistant-agent";
}

export function getThreadPersonaId(thread: {
  metadata?: Record<string, unknown> | null;
}): string | undefined {
  const id = thread.metadata?.personaId;
  return typeof id === "string" ? id : undefined;
}
