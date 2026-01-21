/**
 * Metadata attached to every domain event
 */
export interface EventMeta {
  /** Unique event ID (UUID) */
  readonly id: string;
  /** When the event occurred */
  readonly timestamp: Date;
  /** Optional additional metadata */
  readonly [key: string]: unknown;
}

/**
 * Domain Event - Plain Object interface
 * ユーザーはこの形に従ってイベントを定義する
 * 
 * @example
 * // Plain Object style
 * type ItemAdded = DomainEvent<'ItemAdded', { itemId: string; qty: number }>;
 * 
 * // Class style (also supported - must satisfy the interface)
 * class ItemAdded implements DomainEvent<'ItemAdded', { itemId: string; qty: number }> {
 *   readonly type = 'ItemAdded' as const;
 *   constructor(public readonly data: { itemId: string; qty: number }) {}
 * }
 */
export interface DomainEvent<
  TType extends string = string,
  TData = unknown
> {
  readonly type: TType;
  readonly data: TData;
  readonly meta?: EventMeta;
}

/**
 * イベント Union 型から EventMap を自動生成
 * 
 * @example
 * type CartEvent = CartCreated | ItemAdded;
 * type CartEventMap = ToEventMap<CartEvent>;
 * // => { 'CartCreated': CartCreated, 'ItemAdded': ItemAdded }
 */
export type ToEventMap<E extends DomainEvent> = {
  [K in E['type']]: Extract<E, { type: K }>;
};

/**
 * イベント Union 型からイベントタイプのリテラル Union を取得
 */
export type EventType<E extends DomainEvent> = E['type'];

/**
 * Create event metadata with defaults
 */
export const createMeta = (partial?: Partial<EventMeta>): EventMeta => ({
  id: partial?.id ?? crypto.randomUUID(),
  timestamp: partial?.timestamp ?? new Date(),
  ...partial,
});

/**
 * Helper to create a typed event factory
 * 
 * @example
 * const itemAdded = defineEvent('ItemAdded', (itemId: string, qty: number) => ({ itemId, qty }));
 * const event = itemAdded('apple', 3);
 * // => { type: 'ItemAdded', data: { itemId: 'apple', qty: 3 }, meta: { id: '...', timestamp: ... } }
 */
export const defineEvent = <TType extends string, TArgs extends unknown[], TData>(
  type: TType,
  createData: (...args: TArgs) => TData
) => {
  return (...args: TArgs): DomainEvent<TType, TData> => ({
    type,
    data: createData(...args),
    meta: createMeta(),
  });
};

// ============================================================================
// Legacy support: Class-based DomainEvent (for backward compatibility)
// ============================================================================

/**
 * @deprecated Use Plain Object style instead. This class is kept for backward compatibility.
 * 
 * Type-safe domain event wrapper around CustomEvent
 * 
 * @example
 * class CartCreated extends DomainEventClass<'CartCreated', { cartId: string }> {
 *   constructor(data: { cartId: string }) {
 *     super('CartCreated', data);
 *   }
 * }
 */
export class DomainEventClass<
  TType extends string = string,
  TData = unknown,
> extends CustomEvent<TData> implements DomainEvent<TType, TData> {
  public readonly meta: EventMeta;

  constructor(type: TType, data: TData, meta: Partial<EventMeta> = {}) {
    super(type, { detail: data });
    this.meta = createMeta(meta);
  }

  /**
   * Override type to preserve the literal type.
   * This enables type-safe event filtering with ToEventMap.
   */
  override get type(): TType {
    return super.type as TType;
  }

  /** Get the event payload (alias for detail) */
  get data(): TData {
    return this.detail;
  }
}
