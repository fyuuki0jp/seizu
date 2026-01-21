import type { Command } from '../../../src';

export interface InitializeStock extends Command {
  type: 'InitializeStock';
  quantity: number;
}

export interface ReserveStock extends Command {
  type: 'ReserveStock';
  quantity: number;
  orderId: string;
}

export interface ReleaseStock extends Command {
  type: 'ReleaseStock';
  quantity: number;
  orderId: string;
}

export type InventoryCommand = InitializeStock | ReserveStock | ReleaseStock;

// Factory functions
export const initializeStock = (productId: string, quantity: number): InitializeStock => ({
  type: 'InitializeStock',
  streamId: `inventory-${productId}`,
  quantity,
});

export const reserveStock = (productId: string, quantity: number, orderId: string): ReserveStock => ({
  type: 'ReserveStock',
  streamId: `inventory-${productId}`,
  quantity,
  orderId,
});

export const releaseStock = (productId: string, quantity: number, orderId: string): ReleaseStock => ({
  type: 'ReleaseStock',
  streamId: `inventory-${productId}`,
  quantity,
  orderId,
});
