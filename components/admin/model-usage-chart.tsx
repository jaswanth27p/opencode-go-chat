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
