import { divide, Line, load, money, sum } from "./orders";

export type ProductReturns = {
  productId: string;
  productTitle: string;
  fulfilledUnits: number;
  returnedUnits: number;
  returnRate: number;
  refunds: number;
  reasons: Record<string, number>;
};

export type ProductRevenue = {
  productId: string;
  productTitle: string;
  units: number;
  revenue: number;
};

/**
 * Highest return rate first. The rate uses fulfilled units only, because an unshipped unit
 * cannot come back. The file has no returned quantity, so a returned line counts all its units.
 */
export function returnsByProduct(start: string, end: string): ProductReturns[] {
  return Object.values(byProduct(load(start, end)))
    .map((lines) => {
      const returned = lines.filter((line) => line.returned);
      const fulfilledUnits = sum(lines.filter((line) => line.fulfillmentStatus === "fulfilled").map((line) => line.quantity));
      const returnedUnits = sum(returned.map((line) => line.quantity));
      const reasons: Record<string, number> = {};
      for (const line of returned) reasons[line.returnReason] = (reasons[line.returnReason] ?? 0) + line.quantity;
      return {
        productId: lines[0].productId,
        productTitle: lines[0].productTitle,
        fulfilledUnits,
        returnedUnits,
        returnRate: divide(returnedUnits * 100, fulfilledUnits, 1),
        refunds: money(sum(returned.map((line) => line.refundCents))),
        reasons,
      };
    })
    .sort((a, b) => b.returnRate - a.returnRate || b.returnedUnits - a.returnedUnits || a.productTitle.localeCompare(b.productTitle));
}

/** Revenue is net sales: after discounts, before refunds. */
export function topProductsByRevenue(start: string, end: string, limit = 5): ProductRevenue[] {
  return Object.values(byProduct(load(start, end)))
    .map((lines) => ({
      productId: lines[0].productId,
      productTitle: lines[0].productTitle,
      units: sum(lines.map((line) => line.quantity)),
      revenueCents: sum(lines.map((line) => line.lineTotalCents)),
    }))
    .sort((a, b) => b.revenueCents - a.revenueCents || a.productTitle.localeCompare(b.productTitle))
    .slice(0, limit)
    .map(({ revenueCents, ...product }) => ({ ...product, revenue: money(revenueCents) }));
}

function byProduct(lines: Line[]): Record<string, Line[]> {
  const products: Record<string, Line[]> = {};
  for (const line of lines) (products[line.productId] ??= []).push(line);
  return products;
}
