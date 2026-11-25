/** Read the order history file and give the shared helpers for the metric functions. */
import { readFileSync } from "node:fs";
import path from "node:path";

/** Money values are integer cents, so sums have no floating-point error. */
export type Line = {
  orderId: string;
  lineItemId: string;
  orderDate: string;
  customerId: string;
  isRepeatCustomer: boolean;
  salesChannel: string;
  productId: string;
  productTitle: string;
  productCategory: string;
  variant: string;
  quantity: number;
  lineTotalCents: number;
  fulfillmentStatus: string;
  returned: boolean;
  returnDate: string;
  returnReason: string;
  refundCents: number;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export function ordersPath(): string {
  return process.env.ORDERS_PATH ?? path.join(process.cwd(), "data", "order-history.csv");
}

/** Line items with an order date (or, with by = "returnDate", a return date) from start to end, both included. Dates are "YYYY-MM-DD". */
export function load(start: string, end: string, by: "orderDate" | "returnDate" = "orderDate"): Line[] {
  for (const value of [start, end]) {
    if (!ISO_DATE.test(value) || Number.isNaN(Date.parse(value))) {
      throw new Error(`${value} is not a YYYY-MM-DD date`);
    }
  }
  if (start > end) throw new Error(`start ${start} is after end ${end}`);
  const [header, ...rows] = readFileSync(ordersPath(), "utf8").trim().split(/\r?\n/);
  const keys = header.split(",");
  return rows
    .map((row) => parse(Object.fromEntries(row.split(",").map((value, i) => [keys[i], value]))))
    .filter((line) => start <= line[by] && line[by] <= end);
}

/** All dates from start to end, both included. */
export function eachDay(start: string, end: string): string[] {
  const days: string[] = [];
  for (let time = Date.parse(start); time <= Date.parse(end); time += DAY_MS) {
    days.push(new Date(time).toISOString().slice(0, 10));
  }
  return days;
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function money(cents: number): number {
  return cents / 100;
}

/** part / whole, rounded half up. Gives 0 when whole is 0. */
export function divide(part: number, whole: number, decimals: number): number {
  if (!whole) return 0;
  const scale = 10 ** decimals;
  return Math.round((part * scale) / whole) / scale;
}

function toCents(value: string): number {
  if (!value) return 0;
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
}

function parse(row: Record<string, string>): Line {
  return {
    orderId: row.order_id,
    lineItemId: row.line_item_id,
    orderDate: row.order_date,
    customerId: row.customer_id,
    isRepeatCustomer: row.is_repeat_customer === "true",
    salesChannel: row.sales_channel,
    productId: row.product_id,
    productTitle: row.product_title,
    productCategory: row.product_category,
    variant: row.variant,
    quantity: Number(row.quantity),
    lineTotalCents: toCents(row.line_total),
    fulfillmentStatus: row.fulfillment_status,
    returned: row.returned === "true",
    returnDate: row.return_date,
    returnReason: row.return_reason,
    refundCents: toCents(row.refund_amount),
  };
}
