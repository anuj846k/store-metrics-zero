import type { ToolUIPart } from "ai";
import { Bar, BarChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ChatTools } from "@/lib/chat/tools";

import { CHART_HEIGHT, ChartSkeleton } from "./chart-skeleton";
import styles from "./page.module.css";

/** Colors that are clear on the light and the dark background. */
const BLUE = "#3b82f6";
const AMBER = "#f59e0b";
/** Width of the product title axis in the horizontal bar charts. */
const TITLE_WIDTH = 160;

/** One chart (or table) for each metric. The type and the reason for each: README.md "Charts". */
export function MetricChart({ part }: { part: ToolUIPart<ChatTools> }) {
  // The tool runs: show the shape of its chart until the result comes.
  if (part.state === "input-streaming" || part.state === "input-available") return <ChartSkeleton type={part.type} />;
  if (part.state !== "output-available" || !part.output.hasOrders) return null;

  switch (part.type) {
    case "tool-salesByDay":
      return (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <LineChart data={part.output.result} title="Net sales on each day">
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="netSales" name="Net sales" stroke={BLUE} />
          </LineChart>
        </ResponsiveContainer>
      );

    case "tool-ordersByDay":
      return (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={part.output.result} title="Orders on each day">
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="orderCount" name="Orders" fill={BLUE} />
          </BarChart>
        </ResponsiveContainer>
      );

    case "tool-averageOrderValue":
      return <div className={styles.stat}>Average order value: ${part.output.result.toFixed(2)}</div>;

    case "tool-topProductsByRevenue":
      return (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={part.output.result} layout="vertical" title="Revenue for each product">
            <XAxis type="number" />
            <YAxis type="category" dataKey="productTitle" width={TITLE_WIDTH} />
            <Tooltip />
            <Bar dataKey="revenue" name="Revenue" fill={BLUE} />
          </BarChart>
        </ResponsiveContainer>
      );

    case "tool-returnsByProduct":
      return (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={part.output.result} layout="vertical" title="Return rate for each product">
            <XAxis type="number" unit="%" />
            <YAxis type="category" dataKey="productTitle" width={TITLE_WIDTH} />
            <Tooltip />
            <Bar dataKey="returnRate" name="Return rate" unit="%" fill={AMBER} />
          </BarChart>
        </ResponsiveContainer>
      );

    case "tool-returnedLines":
      if (part.output.result.length === 0) return <div>No returned lines.</div>;
      return (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Variant</th>
                <th>Qty</th>
                <th>Ordered</th>
                <th>Returned</th>
                <th>Reason</th>
                <th>Refund</th>
                <th>Order</th>
              </tr>
            </thead>
            <tbody>
              {part.output.result.map((line) => (
                <tr key={line.lineItemId}>
                  <td>{line.productTitle}</td>
                  <td>{line.variant}</td>
                  <td>{line.quantity}</td>
                  <td>{line.orderDate}</td>
                  <td>{line.returnDate}</td>
                  <td>{line.returnReason}</td>
                  <td>${line.refund.toFixed(2)}</td>
                  <td>{line.orderId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "tool-repeatCustomersByChannel":
      return (
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={part.output.result.breakdowns.salesChannel} title="New and repeat orders for each channel">
            <XAxis dataKey="salesChannel" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="repeat.orderCount" name="Repeat orders" stackId="orders" fill={BLUE} />
            <Bar dataKey="new.orderCount" name="New orders" stackId="orders" fill={AMBER} />
          </BarChart>
        </ResponsiveContainer>
      );
  }
}
