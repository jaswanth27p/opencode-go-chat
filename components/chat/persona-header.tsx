import type { LucideIcon } from "lucide-react";

export function PersonaHeader({
  name,
  description,
  icon: Icon,
}: {
  name: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-card px-3 py-2">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="truncate text-muted-foreground text-xs">{description}</div>
      </div>
    </div>
  );
}
