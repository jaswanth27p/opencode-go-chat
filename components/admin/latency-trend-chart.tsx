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
