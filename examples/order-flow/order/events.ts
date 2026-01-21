import type { DomainEvent } from '../../../src';
import { createMeta } from '../../../src';

export type OrderPlaced = DomainEvent<
  'OrderPlaced',
  { orderId: string; productId: string; quantity: number }
>;

export type OrderConfirmed = DomainEvent<'OrderConfirmed', { orderId: string }>;

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

export type OrderEvent = OrderPlaced | OrderConfirmed;
