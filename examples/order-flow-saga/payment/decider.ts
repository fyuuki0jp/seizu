import { err, ok, type Result } from '../../../src';
import type { PaymentCommand } from './commands';
import { PaymentAlreadyProcessedError, type PaymentError } from './errors';
import {
  createPaymentFailed,
  createPaymentProcessed,
  type PaymentEvent,
} from './events';
import type { PaymentState } from './state';

export const decider = (
  command: PaymentCommand,
  state: PaymentState
): Result<PaymentEvent[], PaymentError> => {
  switch (command.type) {
    case 'ProcessPayment': {
      if (state.exists) {
        return err(new PaymentAlreadyProcessedError(command.orderId));
      }

      // orderId が 'fail-' で始まる場合は決済失敗（テスト用）
      if (command.orderId.startsWith('fail-')) {
        return ok([
          createPaymentFailed(command.orderId, 'Simulated payment failure'),
        ]);
      }

      return ok([createPaymentProcessed(command.orderId, command.amount)]);
    }
    default:
      return ok([]);
  }
};
