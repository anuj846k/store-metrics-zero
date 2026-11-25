import type { ToolUIPart } from "ai";

import type { ChatTools } from "@/lib/chat/tools";

import styles from "./chart-skeleton.module.css";

/** Height of each chart, and of its skeleton, so the page does not move when the chart comes. */
export const CHART_HEIGHT = 240;

type Kind = "line" | "bar" | "barHorizontal" | "stackedBar" | "stat" | "table";

/** The chart type of each metric. It is the same as in MetricChart and README.md "Charts". */
const KINDS: Record<ToolUIPart<ChatTools>["type"], Kind> = {
  "tool-salesByDay": "line",
  "tool-ordersByDay": "bar",
  "tool-averageOrderValue": "stat",
  "tool-topProductsByRevenue": "barHorizontal",
  "tool-returnsByProduct": "barHorizontal",
  "tool-returnedLines": "table",
  "tool-repeatCustomersByChannel": "stackedBar",
};

/** Bar sizes in % of the chart. Fixed values, so the skeleton is the same on the server and the client. */
const SIZES = [45, 70, 30, 85, 55, 65, 40];

/** A gray shape of the chart that the metric will show, while the tool runs. */
export function ChartSkeleton({ type }: { type: ToolUIPart<ChatTools>["type"] }) {
  const kind = KINDS[type];
  const label = "Loading chart";

  if (kind === "stat") return <div className={`${styles.block} ${styles.stat}`} role="status" aria-label={label} />;

  if (kind === "table") {
    return (
      <div className={styles.table} role="status" aria-label={label}>
        {SIZES.slice(0, 4).map((_, i) => (
          <div key={i} className={`${styles.block} ${styles.row}`} />
        ))}
      </div>
    );
  }

  return (
    <div className={`${styles.chart} ${styles[kind] ?? ""}`} style={{ height: CHART_HEIGHT }} role="status" aria-label={label}>
      {kind === "line" ? (
        <svg className={styles.lineSvg} viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline points={SIZES.map((size, i) => `${(i * 100) / (SIZES.length - 1)},${100 - size}`).join(" ")} />
        </svg>
      ) : (
        SIZES.map((size, i) => (
          <div
            key={i}
            className={`${styles.block} ${kind === "stackedBar" ? styles.stacked : ""}`}
            style={kind === "barHorizontal" ? { width: `${size}%` } : { height: `${size}%` }}
          />
        ))
      )}
    </div>
  );
}
