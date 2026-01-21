import type { Engine, Result } from '../../../src';
import type {
  CartCommand,
  CartError,
  CartEvent,
  CartState,
} from '../domain/cart';

export class CreateCartUseCase {
  constructor(
    private readonly engine: Engine<
      CartCommand,
      CartEvent,
      CartState,
      CartError
    >
  ) {}

  async execute(cartId: string): Promise<Result<CartEvent[], CartError>> {
    return this.engine.execute({
      type: 'CreateCart',
      streamId: cartId,
      userId: 'default-user',
    });
  }
}
