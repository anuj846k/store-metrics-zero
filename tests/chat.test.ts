/** Date ranges are the examples in docs/date-rules.md. Metric values are for data/order-history.csv. */
import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveRange, type RangeInput } from "@/lib/chat/dates";
import { tools } from "@/lib/chat/tools";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("resolveRange", () => {
  const today = "2026-11-25";
  const cases: [string, RangeInput, string, string][] = [
    ["today", { period: "today" }, "2026-11-25", "2026-11-25"],
    ["yesterday", { period: "yesterday" }, "2026-11-24", "2026-11-24"],
    ["this week", { period: "thisWeek" }, "2026-11-23", "2026-11-25"],
    ["last week", { period: "lastWeek" }, "2026-11-16", "2026-11-22"],
    ["last 7 days", { period: "lastNDays", days: 7 }, "2026-11-18", "2026-11-24"],
    ["last 30 days", { period: "lastNDays", days: 30 }, "2026-10-26", "2026-11-24"],
    ["this month", { period: "thisMonth" }, "2026-11-01", "2026-11-25"],
    ["last month", { period: "lastMonth" }, "2026-10-01", "2026-10-31"],
    ["this quarter", { period: "thisQuarter" }, "2026-10-01", "2026-11-25"],
    ["last quarter", { period: "lastQuarter" }, "2026-07-01", "2026-09-30"],
    ["this year", { period: "thisYear" }, "2026-01-01", "2026-11-25"],
    ["last year", { period: "lastYear" }, "2025-01-01", "2025-12-31"],
    ["in October", { period: "month", month: 10 }, "2026-10-01", "2026-10-31"],
    ["in October 2025", { period: "month", month: 10, year: 2025 }, "2025-10-01", "2025-10-31"],
    ["since 15 October", { period: "since", start: "2026-10-15" }, "2026-10-15", "2026-11-25"],
    ["no date", undefined, "2026-10-26", "2026-11-24"],
  ];

  it.each(cases)("%s", (_, input, start, end) => {
    expect(resolveRange(input, today)).toEqual({ start, end });
  });

  it("uses last year for a month that did not start yet", () => {
    expect(resolveRange({ period: "month", month: 12 }, today)).toEqual({ start: "2025-12-01", end: "2025-12-31" });
  });

  it("gives last week for the fixed today of the dataset", () => {
    expect(resolveRange({ period: "lastWeek" }, "2025-10-28")).toEqual({ start: "2025-10-20", end: "2025-10-26" });
  });

  it("gives an error when a period has no necessary value", () => {
    expect(() => resolveRange({ period: "lastNDays" }, today)).toThrow("days is necessary");
  });
});

/** Call a tool as the AI SDK does, and give the typed output. */
async function run<T extends { execute?: (...args: never[]) => unknown }>(
  metricTool: T,
  input: Parameters<NonNullable<T["execute"]>>[0],
) {
  const execute = metricTool.execute as (input: unknown, options: unknown) => unknown;
  const output = await execute(input, { toolCallId: "1", messages: [], context: {} });
  return output as Exclude<Awaited<ReturnType<NonNullable<T["execute"]>>>, AsyncIterable<unknown>>;
}

describe("tools", () => {
  it("returnsByProduct uses STORE_TODAY for last week and filters by title", async () => {
    vi.stubEnv("STORE_TODAY", "2025-10-28");
    const output = await run(tools.returnsByProduct, { range: { period: "lastWeek" }, productTitle: "chino" });
    expect(output).toMatchObject({ start: "2025-10-20", end: "2025-10-26", hasOrders: true });
    expect(output.result.map((p) => [p.productTitle, p.returnedUnits])).toEqual([["Utility Chino", 1]]);
  });

  it("returnedLines filters by title", async () => {
    const output = await run(tools.returnedLines, {
      range: { period: "between", start: "2025-05-06", end: "2025-10-27" },
      productTitle: "parka",
    });
    expect(output.result.map((l) => l.variant)).toEqual(["S / Black", "L / Navy", "M / Black"]);
  });

  it("topProductsByRevenue passes the limit", async () => {
    const output = await run(tools.topProductsByRevenue, {
      range: { period: "between", start: "2025-10-01", end: "2025-10-15" },
      limit: 2,
    });
    expect(output.result).toHaveLength(2);
  });

  it("gives hasOrders false for a range with no orders", async () => {
    const output = await run(tools.salesByDay, { range: { period: "between", start: "2024-01-01", end: "2024-01-02" } });
    expect(output.hasOrders).toBe(false);
  });
});
