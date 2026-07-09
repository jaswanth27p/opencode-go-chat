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
