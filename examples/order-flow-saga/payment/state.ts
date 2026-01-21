import type { PaymentEvent } from './events';

export type PaymentStatus = 'pending' | 'processed' | 'failed';

export interface PaymentState {
  exists: boolean;
  status: PaymentStatus;
  orderId: string | null;
  amount: number;
}

export const initialState: PaymentState = {
  exists: false,
  status: 'pending',
  orderId: null,
  amount: 0,
};

export const reducer = (
  state: PaymentState,
  event: PaymentEvent
): PaymentState => {
  switch (event.type) {
    case 'PaymentProcessed':
      return {
        ...state,
        exists: true,
        status: 'processed',
        orderId: event.data.orderId,
        amount: event.data.amount,
      };
    case 'PaymentFailed':
      return {
        ...state,
        exists: true,
        status: 'failed',
        orderId: event.data.orderId,
      };
    default:
      return state;
  }
};
