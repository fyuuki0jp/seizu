import type { Command } from '../../../src';

export interface CreatePurchaseOrder extends Command {
  type: 'CreatePurchaseOrder';
  productId: string;
  quantity: number;
}

export type PurchaseOrderCommand = CreatePurchaseOrder;

// Factory function
export const createPurchaseOrder = (
  purchaseOrderId: string,
  productId: string,
  quantity: number
): CreatePurchaseOrder => ({
  type: 'CreatePurchaseOrder',
  streamId: purchaseOrderId,
  productId,
  quantity,
});
