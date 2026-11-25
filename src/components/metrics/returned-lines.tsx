import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ReturnedLine } from "@/lib/metrics/products";

import { money } from "./format";
import { ProductBarChart } from "./product-bar-chart";

const COLUMNS = ["Product", "Variant", "Qty", "Ordered", "Returned", "Reason", "Refund", "Order"];

function unitsByProduct(lines: ReturnedLine[]) {
  const units: Record<string, number> = {};
  for (const line of lines) units[line.productTitle] = (units[line.productTitle] ?? 0) + line.quantity;
  return Object.entries(units)
    .map(([productTitle, count]) => ({ productTitle, units: count }))
    .sort((a, b) => b.units - a.units || a.productTitle.localeCompare(b.productTitle));
}

export function ReturnedLines({ lines }: { lines: ReturnedLine[] }) {
  return (
    <div className="flex flex-col gap-3">
      <ProductBarChart data={unitsByProduct(lines)} dataKey="units" label="Returned units" color="var(--chart-2)" />
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.lineItemId}>
              <TableCell>{line.productTitle}</TableCell>
              <TableCell>{line.variant}</TableCell>
              <TableCell>{line.quantity}</TableCell>
              <TableCell>{line.orderDate}</TableCell>
              <TableCell>{line.returnDate}</TableCell>
              <TableCell>{line.returnReason}</TableCell>
              <TableCell>{money(line.refund)}</TableCell>
              <TableCell>{line.orderId}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
