/**
 * Domain Error - Plain Object interface
 * 
 * @example
 * type CartNotFound = DomainError<'CartNotFound', { cartId: string }>;
 */
export interface DomainError<
  TTag extends string = string,
  TData = unknown
> {
  readonly tag: TTag;
  readonly message: string;
  readonly data?: TData;
}

/**
 * Helper to create a typed error factory
 * 
 * @example
 * const cartNotFound = defineError('CartNotFound', (cartId: string) => ({
 *   message: `Cart "${cartId}" does not exist`,
 *   data: { cartId },
 * }));
 * 
 * const error = cartNotFound('cart-123');
 * // => { tag: 'CartNotFound', message: 'Cart "cart-123" does not exist', data: { cartId: 'cart-123' } }
 */
export const defineError = <TTag extends string, TArgs extends unknown[], TData = undefined>(
  tag: TTag,
  create: (...args: TArgs) => { message: string; data?: TData }
) => {
  return (...args: TArgs): DomainError<TTag, TData> => {
    const { message, data } = create(...args);
    return { tag, message, data } as DomainError<TTag, TData>;
  };
};

/**
 * Type guard for DomainError
 */
export const isDomainError = <T extends DomainError>(
  error: unknown,
  tag?: T['tag']
): error is T => {
  if (typeof error !== 'object' || error === null) return false;
  if (!('tag' in error) || !('message' in error)) return false;
  if (tag !== undefined && (error as DomainError).tag !== tag) return false;
  return true;
};
