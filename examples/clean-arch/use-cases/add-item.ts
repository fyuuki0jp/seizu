import type { Engine, Result } from '../../../src';
import type {
  CartCommand,
  CartError,
  CartEvent,
  CartState,
} from '../domain/cart';

export class AddItemUseCase {
  constructor(
    private readonly engine: Engine<
      CartCommand,
      CartEvent,
      CartState,
      CartError
    >
  ) {}

  async execute(
    cartId: string,
    itemId: string,
    quantity: number,
    price: number
  ): Promise<Result<CartEvent[], CartError>> {
    return this.engine.execute({
      type: 'AddItem',
      streamId: cartId,
      itemId,
      quantity,
      price,
    });
  }
}
