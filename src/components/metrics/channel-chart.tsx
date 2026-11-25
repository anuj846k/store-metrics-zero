import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ChannelCustomers } from "@/lib/metrics/customers";
import { cn } from "@/lib/utils";

import { CHART_HEIGHT_CLASS } from "./format";

const config = {
  repeat: { label: "Repeat orders", color: "var(--chart-1)" },
  new: { label: "New orders", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function ChannelChart({ channels }: { channels: ChannelCustomers[] }) {
  const data = channels.map((channel) => ({
    salesChannel: channel.salesChannel,
    repeat: channel.repeat.orderCount,
    new: channel.new.orderCount,
  }));

  return (
    <ChartContainer config={config} className={cn("aspect-auto w-full", CHART_HEIGHT_CLASS)}>
      <BarChart data={data} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="salesChannel" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="repeat" stackId="orders" fill="var(--color-repeat)" maxBarSize={64} />
        <Bar dataKey="new" stackId="orders" fill="var(--color-new)" radius={[4, 4, 0, 0]} maxBarSize={64} />
      </BarChart>
    </ChartContainer>
  );
}
