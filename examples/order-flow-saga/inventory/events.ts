import { createMeta } from '../../../src';
import type { DomainEvent } from '../../../src';

export type StockInitialized = DomainEvent<
  'StockInitialized',
  { productId: string; quantity: number }
>;

export type StockReserved = DomainEvent<
  'StockReserved',
  { productId: string; quantity: number; orderId: string }
>;

export type StockReleased = DomainEvent<
  'StockReleased',
  { productId: string; quantity: number; orderId: string }
>;

export const createStockInitialized = (
  productId: string,
  quantity: number
): StockInitialized => ({
  type: 'StockInitialized',
  data: { productId, quantity },
  meta: createMeta(),
});

export const createStockReserved = (
  productId: string,
  quantity: number,
  orderId: string
): StockReserved => ({
  type: 'StockReserved',
  data: { productId, quantity, orderId },
  meta: createMeta(),
});

export const createStockReleased = (
  productId: string,
  quantity: number,
  orderId: string
): StockReleased => ({
  type: 'StockReleased',
  data: { productId, quantity, orderId },
  meta: createMeta(),
});

export type InventoryEvent = StockInitialized | StockReserved | StockReleased;
