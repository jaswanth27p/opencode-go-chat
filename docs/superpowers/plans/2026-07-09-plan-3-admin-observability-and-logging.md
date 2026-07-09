# Plan 3: Admin Observability & Logging

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add many more observability charts to the admin overview, enable structured logging by switching to `PostgresStoreVNext`, and fix the admin sidebar sign-out collapse.

**Architecture:** Switch `mastra.storage` to `PostgresStoreVNext`, add a `createLogger`, enable observability log forwarding, extend `lib/admin/observability.ts` with new SQL aggregations, and add small `recharts` chart components.

**Tech Stack:** Next.js App Router, React, TypeScript, Mastra, PostgreSQL, Recharts, shadcn/ui, Tailwind CSS.

## Global Constraints
- All external input must be validated with zod in `lib/validations/`.
- Shared types go in `types/`; one-domain-per-file.
- Path alias `@/*` for cross-folder imports.
- No new top-level folders.
- Use theme tokens, never raw colors/radii in Tailwind classes.

---

## File structure

| File | Responsibility |
|------|----------------|
| `mastra/index.ts` | Storage switch, logger, observability logging config. |
| `lib/admin/observability.ts` | New overview aggregations. |
| `components/admin/runs-by-hour-chart.tsx` | 24h runs by hour chart. |
| `components/admin/model-usage-chart.tsx` | Top models chart. |
| `components/admin/status-chart.tsx` | Success vs error donut. |
| `components/admin/latency-trend-chart.tsx` | 14-day latency line chart. |
| `components/admin/messages-chart.tsx` | 14-day messages line chart. |
| `app/admin/(dashboard)/page.tsx` | Admin dashboard layout with all charts. |
| `components/admin/admin-sidebar.tsx` | Collapsible sign-out button. |
| `app/admin/(dashboard)/logs/page.tsx` | Logs page (should start working after storage switch). |

---

### Task 1: Switch to PostgresStoreVNext and enable logging

**Files:**
- Modify: `mastra/index.ts`
- Test: `pnpm exec tsc --noEmit`, then restart dev server.

**Interfaces:**
- Consumes: `DATABASE_URL` env var.
- Produces: `mastra` instance with logger + VNext storage.

- [ ] **Step 1: Update imports and storage**

Replace the top of `mastra/index.ts` with:

```ts
import { Mastra } from "@mastra/core";
import { PostgresStoreVNext } from "@mastra/pg";
import { createLogger } from "@mastra/core/logger";
import { Observability, MastraStorageExporter } from "@mastra/observability";
import { assistantAgent } from "./agents/assistant-agent";

export const mastra = new Mastra({
  storage: new PostgresStoreVNext({
    id: "mastra-storage",
    connectionString: process.env.DATABASE_URL as string,
    observability: {
      connectionString: process.env.DATABASE_URL as string,
    },
  }),
  logger: createLogger({ name: "opencode-go-chat", level: "info" }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: "opencode-go-chat",
        exporters: [new MastraStorageExporter()],
        logging: {
          enabled: true,
          level: "info",
        },
      },
    },
  }),
  agents: { assistantAgent },
});
```

- [ ] **Step 2: Type check**

Run: `pnpm exec tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add mastra/index.ts
git commit -m "feat: enable structured logging with PostgresStoreVNext"
```

- [ ] **Step 4: Restart dev server and run Mastra migrations**

After code is applied, restart `next dev`. Run any available Mastra migration:

```bash
npx mastra db migrate
```

If that command is unavailable, Mastra will auto-create tables on first request.

---

### Task 2: Extend overview aggregations

**Files:**
- Modify: `lib/admin/observability.ts`
- Test: `pnpm exec tsc --noEmit`

**Interfaces:**
- Consumes: `prisma`, `mastra`.
- Produces: `OverviewStats` with new chart data arrays.

- [ ] **Step 1: Expand the stats type and queries**

Replace the top of `lib/admin/observability.ts` with:

```ts
import "server-only";
import { prisma } from "@/lib/prisma";
import { mastra } from "@/mastra";

export type OverviewStats = {
  totalConversations: number | null;
  totalMessages: number | null;
  tracesLast24h: number | null;
  errorsLast24h: number | null;
  avgLatencyMsLast24h: number | null;
  runsByDay: { day: string; success: number; error: number }[];
  runsByHour: { hour: string; success: number; error: number }[];
  modelUsage: { model: string; count: number }[];
  statusCounts: { success: number; error: number };
  latencyTrend: { day: string; avgLatencyMs: number }[];
  messagesByDay: { day: string; count: number }[];
};
```

Then append the new queries inside `getOverviewStats` before the return statement:

```ts
const since1h = new Date(Date.now() - 24 * 60 * 60 * 1000);
const runsByHour = await prisma.$queryRaw<{ hour: string; success: bigint; error: bigint }[]>`
  SELECT
    TO_CHAR(DATE_TRUNC('hour', "startedAt"), 'YYYY-MM-DD HH24:00') AS hour,
    COUNT(*) FILTER (WHERE "error" IS NULL)::bigint AS success,
    COUNT(*) FILTER (WHERE "error" IS NOT NULL)::bigint AS error
  FROM mastra_ai_spans
  WHERE "parentSpanId" IS NULL AND "startedAt" >= ${since1h}
  GROUP BY 1
  ORDER BY 1 ASC
`
  .then((rows) => rows.map((r) => ({ hour: r.hour, success: Number(r.success), error: Number(r.error) })))
  .catch((error) => {
    console.error("[admin] runs-by-hour query failed:", error);
    return [];
  });

const modelUsage = await prisma.$queryRaw<{ model: string | null; count: bigint }[]>`
  SELECT
    "requestContext"->>'model' AS model,
    COUNT(*)::bigint AS count
  FROM mastra_ai_spans
  WHERE "parentSpanId" IS NULL AND "startedAt" >= ${since}
  GROUP BY 1
  ORDER BY count DESC
  LIMIT 10
`
  .then((rows) =>
    rows
      .map((r) => ({ model: r.model ?? "unknown", count: Number(r.count) }))
      .filter((r) => r.model !== "unknown")
  )
  .catch((error) => {
    console.error("[admin] model-usage query failed:", error);
    return [];
  });

const statusCounts = await prisma.$queryRaw<{ success: bigint; error: bigint }[]>`
  SELECT
    COUNT(*) FILTER (WHERE "error" IS NULL)::bigint AS success,
    COUNT(*) FILTER (WHERE "error" IS NOT NULL)::bigint AS error
  FROM mastra_ai_spans
  WHERE "parentSpanId" IS NULL AND "startedAt" >= ${since}
`
  .then(([row]) => ({ success: Number(row?.success ?? 0), error: Number(row?.error ?? 0) }))
  .catch((error) => {
    console.error("[admin] status-counts query failed:", error);
    return { success: 0, error: 0 };
  });

const latencyTrend = await prisma.$queryRaw<{ day: string; avg_latency: number | null }[]>`
  SELECT
    TO_CHAR(DATE_TRUNC('day', "startedAt"), 'YYYY-MM-DD') AS day,
    AVG(EXTRACT(EPOCH FROM ("endedAt" - "startedAt")) * 1000) AS avg_latency
  FROM mastra_ai_spans
  WHERE "parentSpanId" IS NULL AND "startedAt" >= ${since14d} AND "endedAt" IS NOT NULL
  GROUP BY 1
  ORDER BY 1 ASC
`
  .then((rows) =>
    rows
      .map((r) => ({ day: r.day, avgLatencyMs: r.avg_latency === null ? 0 : Math.round(r.avg_latency) }))
  )
  .catch((error) => {
    console.error("[admin] latency-trend query failed:", error);
    return [];
  });

const messagesByDay = await prisma.$queryRaw<{ day: string; count: bigint }[]>`
  SELECT
    TO_CHAR(DATE_TRUNC('day', "createdAt"), 'YYYY-MM-DD') AS day,
    COUNT(*)::bigint AS count
  FROM mastra_messages
  WHERE "createdAt" >= ${since14d}
  GROUP BY 1
  ORDER BY 1 ASC
`
  .then((rows) => rows.map((r) => ({ day: r.day, count: Number(r.count) })))
  .catch((error) => {
    console.error("[admin] messages-by-day query failed:", error);
    return [];
  });
```

- [ ] **Step 2: Update return object**

Add the new fields to the return statement:

```ts
return {
  totalConversations: threadsResult?.total ?? null,
  totalMessages,
  tracesLast24h,
  errorsLast24h,
  avgLatencyMsLast24h,
  runsByDay,
  runsByHour,
  modelUsage,
  statusCounts,
  latencyTrend,
  messagesByDay,
};
```

- [ ] **Step 3: Type check**

Run: `pnpm exec tsc --noEmit`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/admin/observability.ts
git commit -m "feat: add more observability aggregations for admin charts"
```

---

### Task 3: Create chart components

**Files:**
- Create: `components/admin/runs-by-hour-chart.tsx`
- Create: `components/admin/model-usage-chart.tsx`
- Create: `components/admin/status-chart.tsx`
- Create: `components/admin/latency-trend-chart.tsx`
- Create: `components/admin/messages-chart.tsx`
- Test: `pnpm exec tsc --noEmit`

**Interfaces:**
- Consumes: chart data arrays.
- Produces: reusable chart components.

- [ ] **Step 1: Runs by hour chart**

Create `components/admin/runs-by-hour-chart.tsx`:

```tsx
"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const chartConfig = {
  success: { label: "Success", color: "var(--chart-1)" },
  error: { label: "Error", color: "var(--destructive)" },
} satisfies ChartConfig;

export function RunsByHourChart({ data }: { data: { hour: string; success: number; error: number }[] }) {
  return (
    <ChartContainer className="h-64 w-full" config={chartConfig}>
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="hour"
          tickFormatter={(value: string) => value.slice(11, 16)}
          tickLine={false}
          tickMargin={8}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="success" fill="var(--color-success)" radius={[0, 0, 4, 4]} stackId="runs" />
        <Bar dataKey="error" fill="var(--color-error)" radius={[4, 4, 0, 0]} stackId="runs" />
      </BarChart>
    </ChartContainer>
  );
}
```

- [ ] **Step 2: Model usage chart**

Create `components/admin/model-usage-chart.tsx`:

```tsx
"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const chartConfig = {
  count: { label: "Runs", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function ModelUsageChart({ data }: { data: { model: string; count: number }[] }) {
  return (
    <ChartContainer className="h-64 w-full" config={chartConfig}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid horizontal={false} />
        <XAxis type="number" hide />
        <YAxis
          axisLine={false}
          dataKey="model"
          tickFormatter={(value: string) => value.split("/").pop() ?? value}
          tickLine={false}
          type="category"
          width={120}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
```

- [ ] **Step 3: Status chart**

Create `components/admin/status-chart.tsx`:

```tsx
"use client";

import { Pie, PieChart } from "recharts";
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const chartConfig = {
  success: { label: "Success", color: "var(--chart-1)" },
  error: { label: "Error", color: "var(--destructive)" },
} satisfies ChartConfig;

export function StatusChart({ data }: { data: { success: number; error: number } }) {
  const chartData = [
    { name: "success", value: data.success, fill: "var(--color-success)" },
    { name: "error", value: data.error, fill: "var(--color-error)" },
  ];
  return (
    <ChartContainer className="h-64 w-full" config={chartConfig}>
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={80} />
      </PieChart>
    </ChartContainer>
  );
}
```

- [ ] **Step 4: Latency trend chart**

Create `components/admin/latency-trend-chart.tsx`:

```tsx
"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const chartConfig = {
  avgLatencyMs: { label: "Avg latency (ms)", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function LatencyTrendChart({ data }: { data: { day: string; avgLatencyMs: number }[] }) {
  return (
    <ChartContainer className="h-64 w-full" config={chartConfig}>
      <LineChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis axisLine={false} dataKey="day" tickFormatter={(v: string) => v.slice(5)} tickLine={false} tickMargin={8} />
        <YAxis axisLine={false} tickLine={false} width={60} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line dataKey="avgLatencyMs" dot={false} stroke="var(--color-avgLatencyMs)" type="monotone" />
      </LineChart>
    </ChartContainer>
  );
}
```

- [ ] **Step 5: Messages chart**

Create `components/admin/messages-chart.tsx`:

```tsx
"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const chartConfig = {
  count: { label: "Messages", color: "var(--chart-4)" },
} satisfies ChartConfig;

export function MessagesChart({ data }: { data: { day: string; count: number }[] }) {
  return (
    <ChartContainer className="h-64 w-full" config={chartConfig}>
      <LineChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis axisLine={false} dataKey="day" tickFormatter={(v: string) => v.slice(5)} tickLine={false} tickMargin={8} />
        <YAxis axisLine={false} tickLine={false} width={50} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line dataKey="count" dot={false} stroke="var(--color-count)" type="monotone" />
      </LineChart>
    </ChartContainer>
  );
}
```

- [ ] **Step 6: Type check**

Run: `pnpm exec tsc --noEmit`

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add components/admin/runs-by-hour-chart.tsx components/admin/model-usage-chart.tsx components/admin/status-chart.tsx components/admin/latency-trend-chart.tsx components/admin/messages-chart.tsx
git commit -m "feat: add admin observability chart components"
```

---

### Task 4: Admin overview page with all charts

**Files:**
- Modify: `app/admin/(dashboard)/page.tsx`
- Test: visual check + `pnpm exec tsc --noEmit`

**Interfaces:**
- Consumes: `OverviewStats`, chart components.
- Produces: dashboard layout.

- [ ] **Step 1: Rewrite the overview page**

Replace `app/admin/(dashboard)/page.tsx` with:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RunsChart } from "@/components/admin/runs-chart";
import { RunsByHourChart } from "@/components/admin/runs-by-hour-chart";
import { ModelUsageChart } from "@/components/admin/model-usage-chart";
import { StatusChart } from "@/components/admin/status-chart";
import { LatencyTrendChart } from "@/components/admin/latency-trend-chart";
import { MessagesChart } from "@/components/admin/messages-chart";
import { getOverviewStats } from "@/lib/admin/observability";

export default async function AdminOverviewPage() {
  const stats = await getOverviewStats();
  const errorRate =
    stats.tracesLast24h === null || stats.errorsLast24h === null
      ? null
      : stats.tracesLast24h === 0
        ? 0
        : Math.round((stats.errorsLast24h / stats.tracesLast24h) * 100);

  const kpis = [
    { label: "Conversations", value: stats.totalConversations },
    { label: "Messages", value: stats.totalMessages },
    { label: "Runs (24h)", value: stats.tracesLast24h },
    { label: "Error rate (24h)", value: errorRate, suffix: "%" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-sm font-normal">{kpi.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {kpi.value === null ? (
                <span className="text-muted-foreground text-base">Unavailable</span>
              ) : (
                `${kpi.value}${kpi.suffix ?? ""}`
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.avgLatencyMsLast24h !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-normal">Average agent run latency (24h)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.avgLatencyMsLast24h} ms</CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Runs, last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.runsByDay.length === 0 ? (
              <p className="text-muted-foreground text-sm">No runs recorded yet.</p>
            ) : (
              <RunsChart data={stats.runsByDay} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Runs, last 24 hours by hour</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.runsByHour.length === 0 ? (
              <p className="text-muted-foreground text-sm">No runs recorded yet.</p>
            ) : (
              <RunsByHourChart data={stats.runsByHour} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top models (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.modelUsage.length === 0 ? (
              <p className="text-muted-foreground text-sm">No model usage recorded yet.</p>
            ) : (
              <ModelUsageChart data={stats.modelUsage} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Run status (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.statusCounts.success + stats.statusCounts.error === 0 ? (
              <p className="text-muted-foreground text-sm">No runs recorded yet.</p>
            ) : (
              <StatusChart data={stats.statusCounts} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average latency, last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.latencyTrend.length === 0 ? (
              <p className="text-muted-foreground text-sm">No latency data yet.</p>
            ) : (
              <LatencyTrendChart data={stats.latencyTrend} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Messages, last 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.messagesByDay.length === 0 ? (
              <p className="text-muted-foreground text-sm">No messages recorded yet.</p>
            ) : (
              <MessagesChart data={stats.messagesByDay} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type check**

Run: `pnpm exec tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/\(dashboard\)/page.tsx
git commit -m "feat: assemble admin dashboard with new charts"
```

---

### Task 5: Fix admin sidebar sign-out collapse

**Files:**
- Modify: `components/admin/admin-sidebar.tsx`
- Test: visual check + `pnpm exec tsc --noEmit`

**Interfaces:**
- Consumes: none.
- Produces: collapsible sign-out button.

- [ ] **Step 1: Wrap sign-out in sidebar menu button**

Replace the `<SidebarFooter>` block in `components/admin/admin-sidebar.tsx`:

```tsx
<SidebarFooter>
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip="Sign out"
        onClick={async () => {
          await fetch("/api/admin/logout", { method: "POST" });
          router.push("/admin/login");
          router.refresh();
        }}
      >
        <LogOut className="size-4" />
        <span>Sign out</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</SidebarFooter>
```

- [ ] **Step 2: Type check**

Run: `pnpm exec tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/admin/admin-sidebar.tsx
git commit -m "fix: make admin sidebar sign-out collapse correctly"
```

---

### Task 6: Logs page notice

**Files:**
- Modify: `app/admin/(dashboard)/logs/page.tsx`
- Test: `pnpm exec tsc --noEmit`

**Interfaces:**
- Consumes: observability store.
- Produces: logs page with explanatory notice.

- [ ] **Step 1: Add a logging notice**

At the top of the logs content in `app/admin/(dashboard)/logs/page.tsx`, add:

```tsx
<p className="text-muted-foreground text-sm">
  Logs are forwarded from Mastra when observability logging is enabled. New logs may take a few seconds to appear.
</p>
```

- [ ] **Step 2: Type check**

Run: `pnpm exec tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/\(dashboard\)/logs/page.tsx
git commit -m "docs: add logs page notice"
```

---

## Spec coverage check

| Spec section | Task |
|--------------|------|
| Switch to PostgresStoreVNext + logger | Task 1 |
| More admin charts | Tasks 2, 3, 4 |
| Admin sidebar sign-out collapse | Task 5 |
| Logs page | Task 6 |
