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
