import type { ToolUIPart } from "ai";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChatTools } from "@/lib/chat/tools";

import { ChannelChart } from "./channel-chart";
import { DailyChart } from "./daily-chart";
import { money } from "./format";
import { MetricSkeleton } from "./metric-skeleton";
import { ProductBarChart } from "./product-bar-chart";
import { ReturnedLines } from "./returned-lines";

type Props = { part: ToolUIPart<ChatTools>; loading: boolean };

export function MetricView({ part, loading }: Props) {
  if (part.state === "input-streaming" || part.state === "input-available") {
    return loading ? <MetricSkeleton type={part.type} /> : null;
  }
  if (part.state !== "output-available" || !part.output.hasOrders) return null;

  switch (part.type) {
    case "tool-salesByDay":
      return <DailyChart kind="line" data={part.output.result} dataKey="netSales" label="Net sales" />;
    case "tool-ordersByDay":
      return <DailyChart kind="bar" data={part.output.result} dataKey="orderCount" label="Orders" />;
    case "tool-averageOrderValue":
      return (
        <Card className="w-fit min-w-64">
          <CardHeader>
            <CardDescription>Average order value</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{money(part.output.result)}</CardTitle>
          </CardHeader>
        </Card>
      );
    case "tool-topProductsByRevenue":
      if (part.output.result.length === 0) return null;
      return <ProductBarChart data={part.output.result} dataKey="revenue" label="Revenue" color="var(--chart-1)" />;
    case "tool-returnsByProduct":
      if (part.output.result.length === 0) return null;
      return (
        <ProductBarChart data={part.output.result} dataKey="returnRate" label="Return rate" color="var(--chart-2)" unit="%" />
      );
    case "tool-returnedLines":
      if (part.output.result.length === 0) return null;
      return <ReturnedLines lines={part.output.result} />;
    case "tool-repeatCustomersByChannel":
      return <ChannelChart channels={part.output.result.breakdowns.salesChannel} />;
  }
}
