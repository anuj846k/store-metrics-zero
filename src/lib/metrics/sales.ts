import { divide, eachDay, load, money, sum } from "./orders";

export type SalesSummary = { netSales: number; orderCount: number };

export function salesByDay(start: string, end: string, salesChannel?: string): { date: string; netSales: number }[] {
  const cents: Record<string, number> = {};
  for (const line of load(start, end, { salesChannel })) {
    cents[line.orderDate] = (cents[line.orderDate] ?? 0) + line.lineTotalCents;
  }
  return eachDay(start, end).map((date) => ({ date, netSales: money(cents[date] ?? 0) }));
}

export function ordersByDay(start: string, end: string, salesChannel?: string): { date: string; orderCount: number }[] {
  const orders: Record<string, Set<string>> = {};
  for (const line of load(start, end, { salesChannel })) {
    (orders[line.orderDate] ??= new Set()).add(line.orderId);
  }
  return eachDay(start, end).map((date) => ({ date, orderCount: orders[date]?.size ?? 0 }));
}

export function salesSummary(start: string, end: string, salesChannel?: string): SalesSummary {
  const lines = load(start, end, { salesChannel });
  return {
    netSales: money(sum(lines.map((line) => line.lineTotalCents))),
    orderCount: new Set(lines.map((line) => line.orderId)).size,
  };
}

export function averageOrderValue(start: string, end: string): number {
  const lines = load(start, end);
  const orderCount = new Set(lines.map((line) => line.orderId)).size;
  return divide(sum(lines.map((line) => line.lineTotalCents)), orderCount * 100, 2);
}
