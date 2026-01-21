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
 *
 * @example
 * type ItemAdded = DomainEvent<'ItemAdded', { itemId: string; qty: number }>;
 */
export interface DomainEvent<TType extends string = string, TData = unknown> {
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

/** Wrap Plain Object event as CustomEvent for EventTarget */
export const wrapAsCustomEvent = <E extends DomainEvent>(
  event: E
): CustomEvent<E['data']> & { originalEvent: E } => {
  const ce = new CustomEvent(event.type, { detail: event.data }) as CustomEvent<
    E['data']
  > & { originalEvent: E };
  ce.originalEvent = event;
  return ce;
};

/** Ensure event has meta, adding if missing */
export const ensureMeta = <E extends DomainEvent>(
  event: E
): E & { meta: EventMeta } =>
  event.meta
    ? (event as E & { meta: EventMeta })
    : { ...event, meta: createMeta() };

/**
 * Helper to create a typed event factory
 *
 * @example
 * const itemAdded = defineEvent('ItemAdded', (itemId: string, qty: number) => ({ itemId, qty }));
 * const event = itemAdded('apple', 3);
 * // => { type: 'ItemAdded', data: { itemId: 'apple', qty: 3 }, meta: { id: '...', timestamp: ... } }
 */
export const defineEvent = <
  TType extends string,
  TArgs extends unknown[],
  TData,
>(
  type: TType,
  createData: (...args: TArgs) => TData
) => {
  return (...args: TArgs): DomainEvent<TType, TData> => ({
    type,
    data: createData(...args),
    meta: createMeta(),
  });
};
