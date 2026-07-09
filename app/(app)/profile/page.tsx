import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireUser } from "@/lib/session";

export default async function ProfilePage() {
  const user = await requireUser();
  const initials = (user.name?.trim() || user.email).slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-start">
          <Avatar className="size-24">
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col gap-1 text-center sm:text-left">
            <p className="text-xl font-semibold">{user.name || "Unnamed"}</p>
            <p className="text-muted-foreground">{user.email}</p>
            <Separator className="my-2" />
            <div className="grid gap-2 text-sm">
              <p>
                <span className="text-muted-foreground">Joined:</span>{" "}
                {user.createdAt.toLocaleDateString()}
              </p>
              <p>
                <span className="text-muted-foreground">User ID:</span>{" "}
                <span className="font-mono text-xs">{user.id}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
