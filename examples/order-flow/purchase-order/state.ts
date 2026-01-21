import type { PurchaseOrderEvent } from './events';

export interface PurchaseOrderState {
  exists: boolean;
  productId: string | null;
  quantity: number;
}

export const initialState: PurchaseOrderState = {
  exists: false,
  productId: null,
  quantity: 0,
};

export const reducer = (state: PurchaseOrderState, event: PurchaseOrderEvent): PurchaseOrderState => {
  switch (event.type) {
    case 'PurchaseOrderCreated':
      return {
        exists: true,
        productId: event.data.productId,
        quantity: event.data.quantity,
      };
    default:
      return state;
  }
};
