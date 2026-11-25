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
| sales_by_day | `salesByDay` | Find the strong and weak days, to time promotions and plan cash. |
| orders_by_day | `ordersByDay` | Plan packing and shipping staff for busy days. |
| average_order_value | `averageOrderValue` | Set the free-shipping threshold and bundle prices. |
| top_products_by_revenue | `topProductsByRevenue` | Reorder the products that sell. Read it with returns: revenue is before refunds. |
| repeat_customers_by_channel | `repeatCustomersByChannel` | Spend the retention budget on the channels that bring customers back. |

Definitions: [`docs/metrics.md`](docs/metrics.md). Date phrases: [`docs/date-rules.md`](docs/date-rules.md).

## Date rule: fixed today

The data ends on 2025-10-27, so "today" is fixed at **Tuesday, 2025-10-28**.
A week is Monday to Sunday, so **last week = 2025-10-20 to 2025-10-26**.

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
