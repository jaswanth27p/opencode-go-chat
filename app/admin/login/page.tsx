"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Login failed");
      return;
    }

    router.push("/admin");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form className="w-full max-w-sm space-y-4 rounded-lg border p-6" onSubmit={handleSubmit}>
        <h1 className="font-medium text-lg">Admin sign in</h1>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            autoFocus
            id="password"
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            value={password}
          />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button className="w-full" disabled={loading || !password} type="submit">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
