/** Metric tools for the chat. Metric definitions: docs/metrics.md. */
import { tool, type InferUITools, type ToolSet, type UIDataTypes, type UIMessage } from "ai";
import { z } from "zod";

import { repeatCustomersByChannel } from "@/lib/metrics/customers";
import { load } from "@/lib/metrics/orders";
import { returnedLines, returnsByProduct, topProductsByRevenue } from "@/lib/metrics/products";
import { averageOrderValue, ordersByDay, salesByDay } from "@/lib/metrics/sales";

import { rangeSchema, resolveRange, storeToday, type Range } from "./dates";

/** Give the exact range with each result, so the answer can tell the dates (date-rules.md rule 9). */
function inRange<T>(input: z.infer<typeof rangeSchema>, metric: (range: Range) => T) {
  const range = resolveRange(input, storeToday());
  return { ...range, hasOrders: load(range.start, range.end).length > 0, result: metric(range) };
}

const productFilterSchema = {
  productTitle: z.string().optional().describe('A word in the product title, for example "parka". Not for a type of product.'),
  category: z
    .enum(["Outerwear", "Tops", "Bottoms", "Knitwear", "Accessories"])
    .optional()
    .describe(
      "Product category. Use it for a type of product: jackets, coats, parkas and shells are Outerwear; " +
        "sweaters and cardigans are Knitwear; jeans and chinos are Bottoms; shirts and tees are Tops; " +
        "beanies and gloves are Accessories.",
    ),
};

/** Keep the rows with the word in the product title and in the category. No filter keeps all rows. */
function matching<T extends { productTitle: string; productCategory: string }>(
  rows: T[],
  { productTitle, category }: { productTitle?: string; category?: string },
): T[] {
  return rows.filter(
    (row) =>
      (!productTitle || row.productTitle.toLowerCase().includes(productTitle.toLowerCase())) &&
      (!category || row.productCategory === category),
  );
}

export const tools = {
  returnsByProduct: tool({
    description:
      "Return rate for each product, for the orders placed in the range: fulfilled units, returned units, " +
      "return rate (returned ÷ fulfilled units), refunds, and the count of each return reason. " +
      'Owners ask: "return rate", "returns", "returnd", "how are returns doing", "is it a sizing thing". ' +
      'For what "came back" in a period, use returnedLines.',
    inputSchema: z.object({ range: rangeSchema, ...productFilterSchema }),
    execute: async ({ range, ...filter }) =>
      inRange(range, ({ start, end }) => matching(returnsByProduct(start, end), filter)),
  }),

  returnedLines: tool({
    description:
      "Each order line that came back in the range (the range is the return date): order, product, " +
      "variant (size / color), quantity, order date, return date, reason and refund. " +
      'Owners ask: "came back", "came back the most", "got returned", "coming back", "which sizes came back", ' +
      '"list each return", "why did the parka come back", "should I reorder".',
    inputSchema: z.object({ range: rangeSchema, ...productFilterSchema }),
    execute: async ({ range, ...filter }) =>
      inRange(range, ({ start, end }) => matching(returnedLines(start, end), filter)),
  }),

  salesByDay: tool({
    description:
      "Net sales (after discounts, before refunds) on each day. A day with no orders has 0. " +
      'Owners ask: "sales", "revenue", "sales per day", "sales trend", "slowing", "sales been weird lately", ' +
      '"revenue last month". For one total or for weeks (Monday to Sunday), add the days.',
    inputSchema: z.object({ range: rangeSchema }),
    execute: async ({ range }) => inRange(range, ({ start, end }) => salesByDay(start, end)),
  }),

  ordersByDay: tool({
    description:
      'Number of orders on each day. Owners ask: "how many orders", "how busy", "orders per day".',
    inputSchema: z.object({ range: rangeSchema }),
    execute: async ({ range }) => inRange(range, ({ start, end }) => ordersByDay(start, end)),
  }),

  averageOrderValue: tool({
    description: 'Net sales ÷ number of orders. Owners ask: "AOV", "average order", "basket size".',
    inputSchema: z.object({ range: rangeSchema }),
    execute: async ({ range }) => inRange(range, ({ start, end }) => averageOrderValue(start, end)),
  }),

  topProductsByRevenue: tool({
    description:
      "Products with the highest net sales (before refunds), with units sold. " +
      'Owners ask: "best seller", "top products", "top sellers", "what sold best", "top 10 products by revenue".',
    inputSchema: z.object({
      range: rangeSchema,
      limit: z.number().int().positive().optional().describe('The N in "top N". Default 5.'),
    }),
    execute: async ({ range, limit }) => inRange(range, ({ start, end }) => topProductsByRevenue(start, end, limit)),
  }),

  repeatCustomersByChannel: tool({
    description:
      "New and repeat customers (orders, customers, net sales, average order value, refund rate), " +
      'in total and for each sales channel. Owners ask: "repeat customers", "returning customers", "came back", ' +
      '"ordering a 2nd time", "% of orders from returning customers". Use it when the subject is a customer. ' +
      "Repeat means the customer bought before, not exactly twice.",
    inputSchema: z.object({ range: rangeSchema }),
    execute: async ({ range }) => inRange(range, ({ start, end }) => repeatCustomersByChannel(start, end)),
  }),
} satisfies ToolSet;

/** Input and output types of each tool, for the UI. */
export type ChatTools = InferUITools<typeof tools>;
export type ChatMessage = UIMessage<never, UIDataTypes, ChatTools>;
