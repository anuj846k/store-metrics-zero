const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const CHART_HEIGHT_CLASS = "h-60";

export function money(value: number): string {
  return currency.format(value);
}

export function monthDay(date: string): string {
  return date.slice(5);
}
