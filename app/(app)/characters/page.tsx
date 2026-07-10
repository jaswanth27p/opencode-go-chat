import { PersonaCard } from "@/components/characters/persona-card";
import { PERSONAS } from "@/mastra/personas";

export default function CharactersPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Characters</h1>
        <p className="text-muted-foreground text-sm">
          Chat with a persona tuned for a specific role. Same chat, different specialist.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PERSONAS.map((persona) => (
          <PersonaCard key={persona.id} persona={persona} />
        ))}
      </div>
    </div>
  );
}
