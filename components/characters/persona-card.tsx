import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Persona } from "@/mastra/personas";

export function PersonaCard({ persona }: { persona: Persona }) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
            <persona.icon className="size-4" />
          </div>
          <CardTitle>{persona.name}</CardTitle>
        </div>
        <CardDescription>{persona.tagline}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">{persona.description}</p>
        <Button render={<Link href={`/characters/${persona.id}`} />} nativeButton={false} className="w-fit gap-2">
          Chat with {persona.name}
          <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
