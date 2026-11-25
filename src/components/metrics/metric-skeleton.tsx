import type { ToolUIPart } from "ai";

import { Skeleton } from "@/components/ui/skeleton";
import type { ChatTools } from "@/lib/chat/tools";
import { cn } from "@/lib/utils";

import { CHART_HEIGHT_CLASS } from "./format";

type Kind = "line" | "bar" | "barHorizontal" | "stackedBar" | "stat";

const KINDS: Record<ToolUIPart<ChatTools>["type"], Kind> = {
  "tool-salesByDay": "line",
  "tool-ordersByDay": "bar",
  "tool-averageOrderValue": "stat",
  "tool-topProductsByRevenue": "barHorizontal",
  "tool-returnsByProduct": "barHorizontal",
  "tool-returnedLines": "barHorizontal",
  "tool-repeatCustomersByChannel": "stackedBar",
};

const SIZES = [45, 70, 30, 85, 55, 65, 40];

const LINE_POINTS = SIZES.map((size, i) => `${(i * 100) / (SIZES.length - 1)},${100 - size}`).join(" ");

export function MetricSkeleton({ type }: { type: ToolUIPart<ChatTools>["type"] }) {
  const kind = KINDS[type];
  const frame = cn("flex w-full gap-2 border-b border-l p-2", CHART_HEIGHT_CLASS);

  if (kind === "stat") return <Skeleton role="status" aria-label="Loading" className="h-24 w-64 rounded-xl" />;

  if (kind === "line") {
    return (
      <div role="status" aria-label="Loading chart" className={frame}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="size-full animate-pulse overflow-visible">
          <polyline
            points={LINE_POINTS}
            fill="none"
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
            className="stroke-muted-foreground/30"
          />
        </svg>
      </div>
    );
  }

  if (kind === "barHorizontal") {
    return (
      <div role="status" aria-label="Loading chart" className={cn(frame, "flex-col justify-around")}>
        {SIZES.map((size, i) => (
          <Skeleton key={i} className="h-5" style={{ width: `${size}%` }} />
        ))}
      </div>
    );
  }

  return (
    <div role="status" aria-label="Loading chart" className={cn(frame, "items-end")}>
      {SIZES.map((size, i) => (
        <div key={i} className="flex h-full flex-1 flex-col justify-end gap-px">
          {kind === "stackedBar" && <Skeleton className="rounded-b-none bg-muted-foreground/20" style={{ height: `${size / 3}%` }} />}
          <Skeleton className={cn(kind === "stackedBar" && "rounded-t-none")} style={{ height: `${size}%` }} />
        </div>
      ))}
    </div>
  );
}
