import type { DomainEvent } from '../../../src';
import { createMeta } from '../../../src';

export type StockInitialized = DomainEvent<
  'StockInitialized',
  { productId: string; quantity: number }
>;

export type StockReserved = DomainEvent<
  'StockReserved',
  { productId: string; quantity: number; orderId: string }
>;

export type StockDepleted = DomainEvent<
  'StockDepleted',
  { productId: string; remainingStock: number }
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

export const createStockDepleted = (
  productId: string,
  remainingStock: number
): StockDepleted => ({
  type: 'StockDepleted',
  data: { productId, remainingStock },
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

export type InventoryEvent =
  | StockInitialized
  | StockReserved
  | StockDepleted
  | StockReleased;
