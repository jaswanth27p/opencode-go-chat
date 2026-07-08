"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/hooks/use-profile";

export function ProfileOverview() {
  const { data, isLoading, isError } = useProfile();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your account</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {isLoading && (
          <>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
          </>
        )}
        {isError && (
          <p className="text-destructive">Failed to load your account.</p>
        )}
        {data && (
          <>
            <p>
              <span className="text-muted-foreground">Name: </span>
              {data.name ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Email: </span>
              {data.email}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
