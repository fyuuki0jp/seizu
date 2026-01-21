import { createMeta } from '../../../src';
import type { DomainEvent } from '../../../src';

export type OrderPlaced = DomainEvent<
  'OrderPlaced',
  { orderId: string; productId: string; quantity: number }
>;

export type OrderConfirmed = DomainEvent<
  'OrderConfirmed',
  { orderId: string }
>;

export type OrderCancelled = DomainEvent<
  'OrderCancelled',
  { orderId: string; reason: string }
>;

export const createOrderPlaced = (
  orderId: string,
  productId: string,
  quantity: number
): OrderPlaced => ({
  type: 'OrderPlaced',
  data: { orderId, productId, quantity },
  meta: createMeta(),
});

export const createOrderConfirmed = (orderId: string): OrderConfirmed => ({
  type: 'OrderConfirmed',
  data: { orderId },
  meta: createMeta(),
});

export const createOrderCancelled = (orderId: string, reason: string): OrderCancelled => ({
  type: 'OrderCancelled',
  data: { orderId, reason },
  meta: createMeta(),
});

export type OrderEvent = OrderPlaced | OrderConfirmed | OrderCancelled;
