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

const productTitleSchema = z
  .string()
  .optional()
  .describe('A word in the product title, for example "jacket" or "parka".');

/** Keep the rows with the word in the product title. No word keeps all rows. */
function withTitle<T extends { productTitle: string }>(rows: T[], productTitle?: string): T[] {
  return rows.filter((row) => !productTitle || row.productTitle.toLowerCase().includes(productTitle.toLowerCase()));
}

export const tools = {
  returnsByProduct: tool({
    description:
      "Returns for each product: fulfilled units, returned units, return rate (returned ÷ fulfilled units), refunds, " +
      'and the count of each return reason. Owners ask: "returns", "returnd", "came back", "got returned", ' +
      '"coming back the most", "is it a sizing thing", "which jackets/coats/parkas/sneakers were returned". ' +
      "Use it when the subject is a product. There is no category field: for jackets or coats, filter by product title.",
    inputSchema: z.object({ range: rangeSchema, productTitle: productTitleSchema }),
    execute: async ({ range, productTitle }) =>
      inRange(range, ({ start, end }) => withTitle(returnsByProduct(start, end), productTitle)),
  }),

  returnedLines: tool({
    description:
      "Each returned order line: order, product, variant (size / color), quantity, order date, return date, " +
      'reason and refund. Owners ask: "show me the returns", "which sizes came back", "list each return", ' +
      '"why did the parka come back", "should I reorder". Use it to see the lines behind returnsByProduct. ' +
      "The range is the order date, not the return date.",
    inputSchema: z.object({ range: rangeSchema, productTitle: productTitleSchema }),
    execute: async ({ range, productTitle }) =>
      inRange(range, ({ start, end }) => withTitle(returnedLines(start, end), productTitle)),
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
