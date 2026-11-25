# Store Metrics

Metrics that a store owner can ask about, calculated from a Shopify order history CSV.
Next.js (App Router), TypeScript, Vitest, pnpm.

## Setup

```bash
pnpm install
pnpm test        # Vitest, uses the real CSV values
pnpm lint        # ESLint
pnpm build       # Next.js production build
pnpm dev         # Next.js dev server
```

## Order file

- Default: `data/order-history.csv`. One row is one order line item, 2025-05-06 to 2025-10-27.
- Set `ORDERS_PATH` to read a different file (for example, a different file in each environment).

```bash
ORDERS_PATH=/path/to/orders.csv pnpm test
```

## Metrics

Each function is in `src/lib/metrics/`. Each one takes `(start, end)` as `"YYYY-MM-DD"`, includes both days, and reads the order file.
A date that is not valid, or a start after the end, gives an error. A range with no orders gives 0, not an error.

| Metric | Function | Merchant decision |
|---|---|---|
| returns_by_product | `returnsByProduct` | Reorder: do not reorder a product that comes back. Fix the size chart when the reason is size. Rate = returned ÷ fulfilled units. |
| returned_lines | `returnedLines` | Reorder by variant: see which size or color comes back, and why. The range is the order date, so the lines add up to `returnsByProduct`. |
| sales_by_day | `salesByDay` | Find the strong and weak days, to time promotions and plan cash. |
| orders_by_day | `ordersByDay` | Plan packing and shipping staff for busy days. |
| average_order_value | `averageOrderValue` | Set the free-shipping threshold and bundle prices. |
| top_products_by_revenue | `topProductsByRevenue` | Reorder the products that sell. Read it with returns: revenue is before refunds. |
| repeat_customers_by_channel | `repeatCustomersByChannel` | Spend the retention budget on the channels that bring customers back. |

Definitions: [`docs/metrics.md`](docs/metrics.md). Date phrases: [`docs/date-rules.md`](docs/date-rules.md).

## Date rule: fixed today

The data ends on 2025-10-27, so "today" is fixed at **Tuesday, 2025-10-28**.
A week is Monday to Sunday, so **last week = 2025-10-20 to 2025-10-26**.

## Chat

The owner asks a question on the home page. The answer streams character by character.

```bash
# .env
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=google/gemini-3.5-flash-lite   # default if not set
STORE_TODAY=2025-10-28                        # fixed today for this dataset; not set = the real date
```

| File | Job |
|---|---|
| `src/app/api/chat/route.ts` | `POST /api/chat`. AI SDK `streamText` with the tools, `isStepCount(5)`, `createUIMessageStreamResponse`. Instructions give today and the date rules. |
| `src/app/page.tsx` | `useChat` from `@ai-sdk/react`. Shows text as it arrives and the name of each tool call. |
| `src/lib/chat/tools.ts` | One tool for each metric. Descriptions use the words that merchants typed (`merchant_report_requests_oct27_*.xlsx`), for example "jakets returnd last wk". |
| `src/lib/chat/dates.ts` | Changes the date phrase into `start` and `end` with `docs/date-rules.md`. |

How a question goes to a tool:

1. The model selects the tool from its description. "Came back" goes to `returnsByProduct` when the subject is a product, and to `repeatCustomersByChannel` when the subject is a customer.
2. The model gives the date phrase as `range.period` (`lastWeek`, `lastNDays` + `days`, `month` + `month`, `between` + `start`/`end`). It does not calculate dates. The code calculates them, because a model makes errors with weekdays and month ends.
3. Some tools take more inputs: `returnsByProduct` and `returnedLines` take `productTitle` ("jacket"), and `topProductsByRevenue` takes `limit` ("top 10").
4. Each tool result has `start`, `end`, `hasOrders` and `result`. The answer gives the exact dates. When `hasOrders` is false, it says "There are no orders from <start> to <end>".
5. The data has no ad spend, ROAS or category. The model says this and does not use the nearest tool.

### Charts

The chat shows one chart (or table) below each tool result (`src/app/metric-chart.tsx`, Recharts). When `hasOrders` is false, it shows no chart.
While the tool runs, a gray skeleton of the same chart type shows in its place (`src/app/chart-skeleton.tsx`), at the same height, so the page does not move. If the request fails or stops, the skeleton goes.

| Metric | Chart | Why this chart |
|---|---|---|
| returned_lines | Table | The owner reads each line (variant, return date, reason) to decide the reorder. A chart cannot show text values. |
| sales_by_day | Line | Sales is a trend over time. A line shows the rise and fall from day to day. |
| orders_by_day | Bar (vertical) | An order count is a whole number for each day. A bar shows the busy days clearly. |
| average_order_value | One number, no chart | The result is one value. A chart of one value gives no more information. |
| top_products_by_revenue | Bar (horizontal) | It is a ranked list. Long product titles are easy to read on the vertical axis. |
| returns_by_product | Bar (horizontal), return rate % | It compares products. Highest rate is first, so the product to stop reordering is at the top. |
| repeat_customers_by_channel | Stacked bar | Each channel bar is all its orders, split into repeat and new. You see the size and the share together. |

Screenshots (dark mode, `STORE_TODAY=2025-10-28`):

| Question | Screenshot |
|---|---|
| "sales per day and orders per day last month": line and bar | ![Sales by day line chart and orders by day bar chart](docs/screenshots/sales-orders.jpg) |
| "returns by product last month, and list each returned line": horizontal bar and table | ![Return rate bar chart and returned lines table](docs/screenshots/returns.jpg) |
| "top products, repeat customers by channel and average order value last 30 days": horizontal bar and stacked bar | ![Top products bar chart and repeat customers stacked bar chart](docs/screenshots/products-customers.jpg) |
| Same question: average order value as one number | ![Average order value](docs/screenshots/average-order-value.jpg) |
| Skeletons while the tools run (horizontal bar and table) | ![Chart skeletons](docs/screenshots/skeletons.jpg) |

Errors: in dev the stream shows the cause (for example, a rate limit). In prod it shows "The answer failed. Try again."

### Model: why Gemini 3.5 Flash Lite, not Gemma 4 31B (free)

We started with `google/gemma-4-31b-it:free`. It accepts `tools` and `tool_choice` for function calling, and `response_format` for JSON output without JSON-schema enforcement. Thus `dates.ts` calculates the dates and zod checks the tool inputs, not the model.

The free models have a high rate limit. Only one upstream provider (Google AI Studio) serves the free Gemma, and all OpenRouter users share it. Most of our requests failed with 429 "temporarily rate-limited upstream". One request selected the correct tool, but the second step (the answer) got the 429.

We had a paid Gemini key, so we added it to OpenRouter (BYOK) and changed to `google/gemini-3.5-flash-lite`:

- It also accepts `tools`, `tool_choice`, `response_format` and `structured_outputs`.
- It answered the real merchant questions on the first try (see the terminal output below).
- It is fast and costs little: $0.30 per million input tokens and $2.50 per million output tokens. One question uses two model calls (tool call, then answer).

To change the model, set `OPENROUTER_MODEL`. The code does not change.

### Claude Code instruction for the chat (quote)

```text
Build the chat streaming route that will print the character as they arrive , use vercel ai sdk
built in functions for it , the docs of the ai sdk are here https://ai-sdk.dev/docs/introduction
and that should include tools as a context so it routes to correct tools .
Use the OPENROUTER_MODEL and OPENROUTER_API_KEY for the AI Engine , metrics functions and their
description are in the md files
each tool should be taking different different inputs based on the question like when merchant
type last week , use todays date and previous week see the @docs/date-rules.md
```

### Terminal output for one question

Real merchant question CRR-25-10-27-0251, with `STORE_TODAY=2025-10-28`:

```bash
curl -N -X POST localhost:3000/api/chat -H 'Content-Type: application/json' \
  -d '{"messages":[{"id":"1","role":"user","parts":[{"type":"text","text":"top 10 products by revenue Oct 1 to Oct 15"}]}]}'
```

`pnpm dev` terminal (the route logs each step):

```text
[chat] question: "top 10 products by revenue Oct 1 to Oct 15"
[chat] step 0 tool call: topProductsByRevenue {"range":{"period":"between","start":"2025-10-01","end":"2025-10-15"},"limit":10}
[chat] step 0 tool result: topProductsByRevenue {"start":"2025-10-01","end":"2025-10-15","hasOrders":true,"result":[{"productId":"P-1001","productTitle":"Alpine Down Parka","units":3,"revenue":657},{"productId":"P-1002","productTitle":"Northridge Insulated Jacket","units":2,"revenue":294.15},{"productId":"P-1008","productTitle":"Selvedge Slim Jeans","units":2,"revenue":212.4},{"productId":"P-1005","productTitle":"Cable Knit Cardigan","units":1,"revenue":98},{"productId":"P-1011","productTitle":"Leather Gloves","units":1,"revenue":46},{"productId":"P-1010","productTitle":"Wool Beanie","units":1,"revenue":24}]}
[chat] step 1 answer: From October 1 to October 15, 2025, here are the top products by revenue:

1. **Alpine Down Parka** – $657.00 (3 units)
2. **Northridge Insulated Jacket** – $294.15 (2 units)
3. **Selvedge Slim Jeans** – $212.40 (2 units)
4. **Cable Knit Cardigan** – $98.00 (1 unit)
5. **Leather Gloves** – $46.00 (1 unit)
6. **Wool Beanie** – $24.00 (1 unit)
```

The model selected `topProductsByRevenue`, set `limit` to 10 from "top 10", and gave the exact dates. Only 6 products had sales in the range, so the answer has 6 rows.

## Output for last week

```text
$ returnsByProduct("2025-10-20", "2025-10-26")
  {"productId":"P-1009","productTitle":"Utility Chino","fulfilledUnits":1,"returnedUnits":1,"returnRate":100,"refunds":74,"reasons":{"Changed mind":1}}
  {"productId":"P-1001","productTitle":"Alpine Down Parka","fulfilledUnits":0,"returnedUnits":0,"returnRate":0,"refunds":0,"reasons":{}}
  {"productId":"P-1011","productTitle":"Leather Gloves","fulfilledUnits":1,"returnedUnits":0,"returnRate":0,"refunds":0,"reasons":{}}
  {"productId":"P-1002","productTitle":"Northridge Insulated Jacket","fulfilledUnits":0,"returnedUnits":0,"returnRate":0,"refunds":0,"reasons":{}}
  {"productId":"P-1010","productTitle":"Wool Beanie","fulfilledUnits":3,"returnedUnits":0,"returnRate":0,"refunds":0,"reasons":{}}

$ salesByDay("2025-10-20", "2025-10-26")
  {"date":"2025-10-20","netSales":0}
  {"date":"2025-10-21","netSales":159}
  {"date":"2025-10-22","netSales":0}
  {"date":"2025-10-23","netSales":238.5}
  {"date":"2025-10-24","netSales":0}
  {"date":"2025-10-25","netSales":72}
  {"date":"2025-10-26","netSales":74}

$ ordersByDay("2025-10-20", "2025-10-26")
  {"date":"2025-10-20","orderCount":0}
  {"date":"2025-10-21","orderCount":1}
  {"date":"2025-10-22","orderCount":0}
  {"date":"2025-10-23","orderCount":1}
  {"date":"2025-10-24","orderCount":0}
  {"date":"2025-10-25","orderCount":1}
  {"date":"2025-10-26","orderCount":1}

$ averageOrderValue("2025-10-20", "2025-10-26")
  135.88

$ topProductsByRevenue("2025-10-20", "2025-10-26")
  {"productId":"P-1001","productTitle":"Alpine Down Parka","units":1,"revenue":197.1}
  {"productId":"P-1002","productTitle":"Northridge Insulated Jacket","units":1,"revenue":159}
  {"productId":"P-1009","productTitle":"Utility Chino","units":1,"revenue":74}
  {"productId":"P-1010","productTitle":"Wool Beanie","units":3,"revenue":72}
  {"productId":"P-1011","productTitle":"Leather Gloves","units":1,"revenue":41.4}

$ repeatCustomersByChannel("2025-10-20", "2025-10-26")
  summary.repeat {"orderCount":2,"customerCount":2,"netSales":231,"averageOrderValue":115.5,"refundRate":0}
  summary.new    {"orderCount":2,"customerCount":2,"netSales":312.5,"averageOrderValue":156.25,"refundRate":23.7}
  {"salesChannel":"Online Store","orderCount":2,"repeatOrderShare":50}
  {"salesChannel":"Point of Sale","orderCount":2,"repeatOrderShare":50}
```

The parka and the jacket show 0 fulfilled units last week because both orders are not shipped. Their return rate is not known yet.

## Claude Code prompt (excerpt)

```text
Metrics (write them in docs/metrics.md, one function each in src/lib/metrics/):
- returnsByProduct: for each product: fulfilled units, returned units,
  return rate = returned ÷ fulfilled units, refunds, count of each reason.
- repeatCustomersByChannel: {summary: {repeat, new}, breakdowns: {salesChannel: [...]}}.
Inputs: each function takes (start, end) as "YYYY-MM-DD", includes both days, and reads
the CSV. Throw if a date is not valid or start > end.
```

**Changed or rejected:** I rejected the first list of 32 metrics because it gave money totals with no product or day. I kept 6 metrics, each with a merchant decision. I changed the return rate to divide by fulfilled units, not all units sold, because an unshipped unit cannot come back. I moved the logic from Python to Next.js, and changed npm to pnpm.
