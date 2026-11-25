import { divide, Line, load, money, sum } from "./orders";

export type CustomerGroup = {
  orderCount: number;
  customerCount: number;
  netSales: number;
  averageOrderValue: number;
  refundRate: number;
};

export type ChannelCustomers = {
  salesChannel: string;
  orderCount: number;
  repeatOrderShare: number;
  repeat: CustomerGroup;
  new: CustomerGroup;
};

export type RepeatCustomersByChannel = {
  summary: { repeat: CustomerGroup; new: CustomerGroup };
  breakdowns: { salesChannel: ChannelCustomers[] };
};

/**
 * is_repeat_customer is set for each order: it is true when the customer bought before,
 * also before the start of the range. Channels with the most orders are first.
 */
export function repeatCustomersByChannel(start: string, end: string): RepeatCustomersByChannel {
  const lines = load(start, end);
  const channels: Record<string, Line[]> = {};
  for (const line of lines) (channels[line.salesChannel] ??= []).push(line);
  return {
    summary: split(lines),
    breakdowns: {
      salesChannel: Object.entries(channels)
        .map(([salesChannel, channelLines]) => {
          const { repeat, new: first } = split(channelLines);
          const orderCount = repeat.orderCount + first.orderCount;
          return {
            salesChannel,
            orderCount,
            repeatOrderShare: divide(repeat.orderCount * 100, orderCount, 1),
            repeat,
            new: first,
          };
        })
        .sort((a, b) => b.orderCount - a.orderCount || a.salesChannel.localeCompare(b.salesChannel)),
    },
  };
}

function split(lines: Line[]): { repeat: CustomerGroup; new: CustomerGroup } {
  return {
    repeat: group(lines.filter((line) => line.isRepeatCustomer)),
    new: group(lines.filter((line) => !line.isRepeatCustomer)),
  };
}

function group(lines: Line[]): CustomerGroup {
  const orderCount = new Set(lines.map((line) => line.orderId)).size;
  const netCents = sum(lines.map((line) => line.lineTotalCents));
  return {
    orderCount,
    customerCount: new Set(lines.map((line) => line.customerId)).size,
    netSales: money(netCents),
    averageOrderValue: divide(netCents, orderCount * 100, 2),
    refundRate: divide(sum(lines.map((line) => line.refundCents)) * 100, netCents, 1),
  };
}
