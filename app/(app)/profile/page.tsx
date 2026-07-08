import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/session";

export default async function ProfilePage() {
  const user = await requireUser();
  const initials = (user.name?.trim() || user.email).slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="size-16">
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-medium">{user.name || "Unnamed"}</p>
            <p className="text-muted-foreground">{user.email}</p>
            <p className="text-muted-foreground">
              Joined {user.createdAt.toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
