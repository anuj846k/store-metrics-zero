/** Expected values are for data/order-history.csv. */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { repeatCustomersByChannel } from "@/lib/metrics/customers";
import { ordersPath } from "@/lib/metrics/orders";
import { returnedLines, returnsByProduct, topProductsByRevenue } from "@/lib/metrics/products";
import { averageOrderValue, ordersByDay, salesByDay } from "@/lib/metrics/sales";

const ALL = ["2025-05-06", "2025-10-27"] as const;
const EMPTY = ["2024-01-01", "2024-01-03"] as const;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("returnsByProduct", () => {
  it("ranks products by return rate of fulfilled units", () => {
    const rows = returnsByProduct(...ALL).map((p) => [p.productTitle, p.fulfilledUnits, p.returnedUnits, p.returnRate, p.refunds]);
    expect(rows).toEqual([
      ["Alpine Down Parka", 3, 3, 100, 657],
      ["Harbor Rain Shell", 1, 1, 100, 94],
      ["Northridge Insulated Jacket", 3, 2, 66.7, 263.94],
      ["Utility Chino", 3, 1, 33.3, 74],
      ["Organic Cotton Tee", 4, 1, 25, 28],
      ["Cable Knit Cardigan", 1, 0, 0, 0],
      ["Leather Gloves", 2, 0, 0, 0],
      ["Linen Button Shirt", 1, 0, 0, 0],
      ["Merino Crew Sweater", 1, 0, 0, 0],
      ["Selvedge Slim Jeans", 4, 0, 0, 0],
      ["Wool Beanie", 4, 0, 0, 0],
    ]);
  });

  it("counts return reasons", () => {
    const parka = returnsByProduct(...ALL)[0];
    expect(parka.reasons).toEqual({ "Too small": 1, "Too large": 1, Defective: 1 });
  });

  it("uses refund_amount, not line_total, for refunds", () => {
    const jacket = returnsByProduct("2025-09-24", "2025-09-24")[0];
    expect([jacket.productTitle, jacket.refunds]).toEqual(["Northridge Insulated Jacket", 128.79]);
  });

  it("gives a rate of 0 when no unit is fulfilled", () => {
    const rows = returnsByProduct("2025-10-27", "2025-10-27").map((p) => [p.productTitle, p.fulfilledUnits, p.returnRate]);
    expect(rows).toEqual([
      ["Cable Knit Cardigan", 0, 0],
      ["Harbor Rain Shell", 0, 0],
    ]);
  });
});

describe("returnedLines", () => {
  it("gives each returned line, by product title, then newest return first", () => {
    const rows = returnedLines(...ALL).map((l) => [l.productTitle, l.variant, l.returnDate, l.returnReason, l.refund]);
    expect(rows).toEqual([
      ["Alpine Down Parka", "S / Black", "2025-10-26", "Defective", 219],
      ["Alpine Down Parka", "L / Navy", "2025-10-24", "Too large", 219],
      ["Alpine Down Parka", "M / Black", "2025-10-21", "Too small", 219],
      ["Harbor Rain Shell", "M / Navy", "2025-07-08", "Not as pictured", 94],
      ["Northridge Insulated Jacket", "S / Olive", "2025-10-23", "Too small", 135.15],
      ["Northridge Insulated Jacket", "L / Black", "2025-10-06", "Changed mind", 128.79],
      ["Organic Cotton Tee", "S / Olive", "2025-09-11", "Too large", 28],
      ["Utility Chino", "L / Black", "2025-10-27", "Changed mind", 74],
    ]);
  });

  it("adds up to the returned units of returnsByProduct", () => {
    const units = (start: string, end: string) => returnedLines(start, end).reduce((total, l) => total + l.quantity, 0);
    const returned = (start: string, end: string) => returnsByProduct(start, end).reduce((total, p) => total + p.returnedUnits, 0);
    expect(units(...ALL)).toBe(returned(...ALL));
    expect(units("2025-10-01", "2025-10-15")).toBe(returned("2025-10-01", "2025-10-15"));
  });

  it("uses the order date for the range, not the return date", () => {
    expect(returnedLines("2025-10-20", "2025-10-26").map((l) => [l.orderId, l.orderDate, l.returnDate])).toEqual([
      ["#3102", "2025-10-26", "2025-10-27"],
    ]);
  });

  it("gives an empty list for a range with no orders", () => {
    expect(returnedLines(...EMPTY)).toEqual([]);
  });
});

describe("salesByDay", () => {
  it("gives every day in the range, with 0 for a day with no orders", () => {
    const days = salesByDay(...ALL);
    expect(days).toHaveLength(175);
    expect(days[0]).toEqual({ date: "2025-05-06", netSales: 130 });
    expect(days[1]).toEqual({ date: "2025-05-07", netSales: 0 });
    expect(days.find((d) => d.date === "2025-10-23")).toEqual({ date: "2025-10-23", netSales: 238.5 });
    expect(days.at(-1)).toEqual({ date: "2025-10-27", netSales: 182.2 });
  });
});

describe("ordersByDay", () => {
  it("counts distinct orders for each day", () => {
    const days = ordersByDay(...ALL);
    expect(days).toHaveLength(175);
    expect(days.reduce((total, d) => total + d.orderCount, 0)).toBe(20);
    expect(days.find((d) => d.date === "2025-10-23")).toEqual({ date: "2025-10-23", orderCount: 1 });
    expect(days.find((d) => d.date === "2025-10-24")).toEqual({ date: "2025-10-24", orderCount: 0 });
  });

  it("crosses a month end", () => {
    expect(ordersByDay("2025-05-31", "2025-06-01").map((d) => d.date)).toEqual(["2025-05-31", "2025-06-01"]);
  });
});

describe("averageOrderValue", () => {
  it("divides net sales by orders", () => {
    expect(averageOrderValue(...ALL)).toBe(154.92);
    expect(averageOrderValue("2025-10-01", "2025-10-31")).toBe(173.94);
  });
});

describe("topProductsByRevenue", () => {
  it("gives the 5 products with the highest net sales", () => {
    expect(topProductsByRevenue(...ALL).map((p) => [p.productTitle, p.units, p.revenue])).toEqual([
      ["Alpine Down Parka", 4, 854.1],
      ["Northridge Insulated Jacket", 4, 596.25],
      ["Selvedge Slim Jeans", 4, 436.6],
      ["Merino Crew Sweater", 3, 264],
      ["Utility Chino", 3, 222],
    ]);
  });

  it("accepts a limit", () => {
    expect(topProductsByRevenue(...ALL, 1)).toEqual([
      { productId: "P-1001", productTitle: "Alpine Down Parka", units: 4, revenue: 854.1 },
    ]);
  });
});

describe("repeatCustomersByChannel", () => {
  it("splits all orders into repeat and new customers", () => {
    expect(repeatCustomersByChannel(...ALL).summary).toEqual({
      repeat: { orderCount: 8, customerCount: 7, netSales: 1129.65, averageOrderValue: 141.21, refundRate: 25.8 },
      new: { orderCount: 12, customerCount: 12, netSales: 1968.7, averageOrderValue: 164.06, refundRate: 41.9 },
    });
  });

  it("gives the repeat order share for each channel, most orders first", () => {
    const channels = repeatCustomersByChannel(...ALL).breakdowns.salesChannel;
    expect(channels.map((c) => [c.salesChannel, c.orderCount, c.repeat.orderCount, c.repeatOrderShare])).toEqual([
      ["Online Store", 11, 4, 36.4],
      ["Point of Sale", 4, 2, 50],
      ["Shop app", 3, 2, 66.7],
      ["Instagram", 2, 0, 0],
    ]);
  });

  it("gives the values for repeat and new customers in a channel", () => {
    const [onlineStore] = repeatCustomersByChannel(...ALL).breakdowns.salesChannel;
    expect(onlineStore.repeat).toEqual({ orderCount: 4, customerCount: 4, netSales: 616.5, averageOrderValue: 154.13, refundRate: 25.4 });
    expect(onlineStore.new.netSales).toBe(1265.7);
  });

  it("gives zero values for a group with no orders", () => {
    const instagram = repeatCustomersByChannel(...ALL).breakdowns.salesChannel.at(-1)!;
    expect(instagram.repeat).toEqual({ orderCount: 0, customerCount: 0, netSales: 0, averageOrderValue: 0, refundRate: 0 });
  });
});

describe("date range", () => {
  it("gives zero or empty values for a range with no orders", () => {
    expect(returnsByProduct(...EMPTY)).toEqual([]);
    expect(topProductsByRevenue(...EMPTY)).toEqual([]);
    expect(averageOrderValue(...EMPTY)).toBe(0);
    expect(repeatCustomersByChannel(...EMPTY).breakdowns.salesChannel).toEqual([]);
    expect(salesByDay(...EMPTY).map((d) => d.netSales)).toEqual([0, 0, 0]);
    expect(ordersByDay(...EMPTY).map((d) => d.orderCount)).toEqual([0, 0, 0]);
  });

  it("rejects a start after the end", () => {
    expect(() => averageOrderValue("2025-10-01", "2025-09-01")).toThrow("after end");
  });

  it("rejects a date that is not YYYY-MM-DD", () => {
    expect(() => averageOrderValue("10/01/2025", "2025-10-31")).toThrow("not a YYYY-MM-DD date");
  });
});

describe("order file", () => {
  it("comes from ORDERS_PATH when it is set", () => {
    const header = readFileSync(ordersPath(), "utf8").split("\n")[0];
    const row = "#1,LI-1,2025-01-02,C-1,false,P-1,Hat,Accessories,One Size,2,10.00,1.00,19.00,Online Store,fulfilled,false,,,";
    const file = path.join(mkdtempSync(path.join(tmpdir(), "orders-")), "orders.csv");
    writeFileSync(file, `${header}\n${row}\n`);
    vi.stubEnv("ORDERS_PATH", file);
    expect(averageOrderValue("2025-01-01", "2025-01-31")).toBe(19);
  });
});
