import type { OrderEvent } from './events';

export type OrderStatus = 'pending' | 'confirmed' | 'cancelled';

export interface OrderState {
  exists: boolean;
  status: OrderStatus;
  productId: string | null;
  quantity: number;
}

export const initialState: OrderState = {
  exists: false,
  status: 'pending',
  productId: null,
  quantity: 0,
};

export const reducer = (state: OrderState, event: OrderEvent): OrderState => {
  switch (event.type) {
    case 'OrderPlaced':
      return {
        ...state,
        exists: true,
        status: 'pending',
        productId: event.data.productId,
        quantity: event.data.quantity,
      };
    case 'OrderConfirmed':
      return {
        ...state,
        status: 'confirmed',
      };
    default:
      return state;
  }
};
