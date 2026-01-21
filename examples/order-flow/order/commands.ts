import type { Command } from '../../../src';

export interface PlaceOrder extends Command {
  type: 'PlaceOrder';
  productId: string;
  quantity: number;
}

export interface ConfirmOrder extends Command {
  type: 'ConfirmOrder';
}

export type OrderCommand = PlaceOrder | ConfirmOrder;

// Factory functions
export const placeOrder = (orderId: string, productId: string, quantity: number): PlaceOrder => ({
  type: 'PlaceOrder',
  streamId: orderId,
  productId,
  quantity,
});

export const confirmOrder = (orderId: string): ConfirmOrder => ({
  type: 'ConfirmOrder',
  streamId: orderId,
});
