import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

const ROW_HEIGHT = 44;
const MIN_HEIGHT = 120;
const TITLE_WIDTH = 180;

type Props<K extends string> = {
  data: ({ productTitle: string } & Record<K, number>)[];
  dataKey: K;
  label: string;
  color: string;
  unit?: string;
};

export function ProductBarChart<K extends string>({ data, dataKey, label, color, unit }: Props<K>) {
  const config = { [dataKey]: { label, color } } satisfies ChartConfig;

  return (
    <ChartContainer
      config={config}
      className="aspect-auto w-full"
      style={{ height: Math.max(MIN_HEIGHT, data.length * ROW_HEIGHT) }}
    >
      <BarChart data={data} layout="vertical" margin={{ right: 24 }} accessibilityLayer>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" unit={unit} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="productTitle" width={TITLE_WIDTH} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey={dataKey} fill={`var(--color-${dataKey})`} radius={4} maxBarSize={32} />
      </BarChart>
    </ChartContainer>
  );
}
