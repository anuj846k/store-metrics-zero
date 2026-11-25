import { z } from "zod";

const DAY_MS = 86_400_000;

export const PERIODS = [
  "today",
  "yesterday",
  "thisWeek",
  "lastWeek",
  "lastNDays",
  "thisMonth",
  "lastMonth",
  "thisQuarter",
  "lastQuarter",
  "thisYear",
  "lastYear",
  "month",
  "since",
  "between",
] as const;

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const rangeSchema = z
  .object({
    period: z.enum(PERIODS).describe(
      'The date phrase of the owner. "last wk" → lastWeek. "last 14 days" → lastNDays with days 14. ' +
        '"in October" → month with month 10. "since July 1" → since with start. "Oct 1 to Oct 15" → between.',
    ),
    days: z.number().int().positive().optional().describe("Only for lastNDays."),
    month: z.number().int().min(1).max(12).optional().describe("Only for month. 1 is January."),
    year: z.number().int().optional().describe("Only for month, when the owner gives a year."),
    start: date.optional().describe("Only for since and between. YYYY-MM-DD."),
    end: date.optional().describe("Only for between. YYYY-MM-DD."),
  })
  .optional()
  .describe('Leave it out when the owner gives no date. Then the range is the last 30 days.');

export type RangeInput = z.infer<typeof rangeSchema>;
export type Range = { start: string; end: string };

export function storeToday(): string {
  return process.env.STORE_TODAY ?? new Date().toLocaleDateString("en-CA");
}

export function resolveRange(input: RangeInput, today: string): Range {
  if (!input) return lastDays(30, today);
  const [year, month] = today.split("-").map(Number);
  const monday = addDays(today, -((new Date(today).getUTCDay() + 6) % 7));
  const quarter = Math.floor((month - 1) / 3) * 3 + 1;
  switch (input.period) {
    case "today":
      return { start: today, end: today };
    case "yesterday":
      return { start: addDays(today, -1), end: addDays(today, -1) };
    case "thisWeek":
      return { start: monday, end: today };
    case "lastWeek":
      return { start: addDays(monday, -7), end: addDays(monday, -1) };
    case "lastNDays":
      return lastDays(required(input.days, "days"), today);
    case "thisMonth":
      return { start: day(year, month, 1), end: today };
    case "lastMonth":
      return { start: day(year, month - 1, 1), end: day(year, month, 0) };
    case "thisQuarter":
      return { start: day(year, quarter, 1), end: today };
    case "lastQuarter":
      return { start: day(year, quarter - 3, 1), end: day(year, quarter, 0) };
    case "thisYear":
      return { start: day(year, 1, 1), end: today };
    case "lastYear":
      return { start: day(year - 1, 1, 1), end: day(year - 1, 12, 31) };
    case "month": {
      const m = required(input.month, "month");
      const y = input.year ?? (m <= month ? year : year - 1);
      return { start: day(y, m, 1), end: day(y, m + 1, 0) };
    }
    case "since":
      return { start: required(input.start, "start"), end: today };
    case "between":
      return { start: required(input.start, "start"), end: required(input.end, "end") };
  }
}

function lastDays(days: number, today: string): Range {
  return { start: addDays(today, -days), end: addDays(today, -1) };
}

function addDays(value: string, days: number): string {
  return new Date(Date.parse(value) + days * DAY_MS).toISOString().slice(0, 10);
}

function day(year: number, month: number, dayOfMonth: number): string {
  return new Date(Date.UTC(year, month - 1, dayOfMonth)).toISOString().slice(0, 10);
}

function required<T>(value: T | undefined, name: string): T {
  if (value === undefined) throw new Error(`${name} is necessary for this period`);
  return value;
}
