import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

import { CHART_HEIGHT_CLASS, monthDay } from "./format";

type Props<K extends string> = {
  kind: "line" | "bar";
  data: ({ date: string } & Record<K, number>)[];
  dataKey: K;
  label: string;
};

export function DailyChart<K extends string>({ kind, data, dataKey, label }: Props<K>) {
  const config = { [dataKey]: { label, color: "var(--chart-1)" } } satisfies ChartConfig;
  const color = `var(--color-${dataKey})`;
  const axes = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="date" tickFormatter={monthDay} tickLine={false} axisLine={false} minTickGap={24} />
      <YAxis tickLine={false} axisLine={false} width={40} allowDecimals={false} />
      <ChartTooltip content={<ChartTooltipContent />} />
    </>
  );

  return (
    <ChartContainer config={config} className={cn("aspect-auto w-full", CHART_HEIGHT_CLASS)}>
      {kind === "line" ? (
        <LineChart data={data} accessibilityLayer>
          {axes}
          <Line dataKey={dataKey} type="monotone" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      ) : (
        <BarChart data={data} accessibilityLayer>
          {axes}
          <Bar dataKey={dataKey} fill={color} radius={4} />
        </BarChart>
      )}
    </ChartContainer>
  );
}
