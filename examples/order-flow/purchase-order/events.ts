import { createMeta } from '../../../src';
import type { DomainEvent } from '../../../src';

export type PurchaseOrderCreated = DomainEvent<
  'PurchaseOrderCreated',
  { purchaseOrderId: string; productId: string; quantity: number }
>;

export const createPurchaseOrderCreated = (
  purchaseOrderId: string,
  productId: string,
  quantity: number
): PurchaseOrderCreated => ({
  type: 'PurchaseOrderCreated',
  data: { purchaseOrderId, productId, quantity },
  meta: createMeta(),
});

export type PurchaseOrderEvent = PurchaseOrderCreated;
