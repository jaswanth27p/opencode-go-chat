"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
  success: { label: "Success", color: "var(--chart-1)" },
  error: { label: "Error", color: "var(--destructive)" },
} satisfies ChartConfig;

export function RunsChart({
  data,
}: {
  data: { day: string; success: number; error: number }[];
}) {
  return (
    <ChartContainer className="h-64 w-full" config={chartConfig}>
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="day"
          tickFormatter={(value: string) => value.slice(5)}
          tickLine={false}
          tickMargin={8}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="success" fill="var(--color-success)" radius={[0, 0, 4, 4]} stackId="runs" />
        <Bar dataKey="error" fill="var(--color-error)" radius={[4, 4, 0, 0]} stackId="runs" />
      </BarChart>
    </ChartContainer>
  );
}
