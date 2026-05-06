import { OrderStatus } from '@prisma/client';

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: ['REFUNDED'],
  RETURNED: ['REFUNDED'],
  REFUNDED: [],
};

export const CANCELLABLE_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED'];

export const STATUS_DISPLAY_NAMES: Record<OrderStatus, string> = {
  PENDING: 'Pending Payment',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
  REFUNDED: 'Refunded',
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  const allowedTransitions = ORDER_STATUS_TRANSITIONS[from];
  return allowedTransitions?.includes(to) ?? false;
}

export function getNextValidStatuses(current: OrderStatus): OrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[current] ?? [];
}

export function isCancellable(current: OrderStatus): boolean {
  return CANCELLABLE_STATUSES.includes(current);
}

export function isTerminal(current: OrderStatus): boolean {
  return ['DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED'].includes(current);
}
