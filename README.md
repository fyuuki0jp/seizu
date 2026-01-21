# RISE - Reactive Immutable State Engine

[![CI](https://github.com/rise-es/rise/actions/workflows/test.yml/badge.svg)](https://github.com/rise-es/rise/actions/workflows/test.yml)
[![npm version](https://img.shields.io/npm/v/rise.svg)](https://www.npmjs.com/package/rise)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A zero-dependency TypeScript library for Event Sourcing with Railway Oriented Programming.

## Features

- **Zero Dependencies** - Only standard Web APIs (EventTarget, CustomEvent, crypto)
- **Railway Oriented Programming** - Type-safe error handling with `Result<T, E>`
- **Event Sourcing** - All state changes as immutable events
- **Reactive** - Built-in event dispatching for side effects
- **Type Safe** - Full TypeScript support with inference
- **Type-Safe Event Listeners** - `engine.on('EventType', handler)` with full type inference
- **FP-First Design** - Plain objects, pure functions, no classes required
- **Snapshot support** - Fast rehydration for aggregates with many events
- **Projection support** - Build read models from events

## Installation

```bash
npm install rise
# or
pnpm add rise
```

## Quick Start

```typescript
import { 
  Engine, 
  InMemoryEventStore, 
  ok, 
  err, 
  isOk,
  createMeta,
  type DomainEvent,
  type Result,
  type Command,
} from 'rise';

// 1. Define Events (Plain Object style)
type UserCreated = DomainEvent<'UserCreated', { name: string }>;

const userCreated = (name: string): UserCreated => ({
  type: 'UserCreated',
  data: { name },
  meta: createMeta(),
});

// 2. Define State
type UserState = {
  exists: boolean;
  name: string | null;
};

const initialState: UserState = { exists: false, name: null };

// 3. Define Reducer (pure function)
const reducer = (state: UserState, event: UserCreated): UserState => {
  if (event.type === 'UserCreated') {
    return { exists: true, name: event.data.name };
  }
  return state;
};

// 4. Define Decider (business logic, pure function)
type CreateUser = Command & { type: 'CreateUser'; name: string };

const decider = (
  command: CreateUser, 
  state: UserState
): Result<UserCreated[], Error> => {
  if (state.exists) {
    return err(new Error('User already exists'));
  }
  return ok([userCreated(command.name)]);
};

// 5. Create Engine and Execute
const engine = new Engine(new InMemoryEventStore(), {
  initialState,
  reducer,
  decider,
});

const result = await engine.execute({
  type: 'CreateUser',
  streamId: 'user-123',
  name: 'Alice',
});

if (isOk(result)) {
  console.log('User created!');
}
```

### Aggregate Pattern (Simplified Exports)

For cleaner code organization, export your aggregate config as a single object:

```typescript
// order/index.ts
import type { AggregateConfig } from 'rise';
import { initialState, reducer } from './state';
import { decider } from './decider';

export const orderAggregate: AggregateConfig<OrderCommand, OrderEvent, OrderState, OrderError> = {
  initialState,
  reducer,
  decider,
};

// Re-export types and command factories
export { placeOrder, confirmOrder } from './commands';
export type { OrderEvent, OrderCommand };
```

Then in your main file:

```typescript
import { orderAggregate, placeOrder, type OrderEvent } from './order';

const engine = new Engine(new InMemoryEventStore(), orderAggregate, { bus });
```

## Core Concepts

### Result Type (Railway Oriented Programming)

Instead of throwing exceptions, return `Result<T, E>`:

```typescript
import { ok, err, isOk, isErr, map, flatMap } from 'rise';

// Success path
const success = ok(42);

// Failure path  
const failure = err(new Error('Something went wrong'));

// Pattern matching
if (isOk(result)) {
  console.log(result.value);
} else {
  console.log(result.error);
}

// Chaining
const doubled = map(ok(21), x => x * 2); // { ok: true, value: 42 }
```

### Domain Events

Events are immutable facts that happened. Define them as Plain Objects:

```typescript
import { type DomainEvent, createMeta, defineEvent } from 'rise';

// Option 1: Type + Factory function (recommended)
type OrderPlaced = DomainEvent<'OrderPlaced', { orderId: string; amount: number }>;

const orderPlaced = (orderId: string, amount: number): OrderPlaced => ({
  type: 'OrderPlaced',
  data: { orderId, amount },
  meta: createMeta(),
});

// Option 2: Using defineEvent helper (even shorter)
const orderPlaced = defineEvent('OrderPlaced', (orderId: string, amount: number) => ({
  orderId,
  amount,
}));

// Usage
const event = orderPlaced('order-1', 99.99);
console.log(event.type);       // 'OrderPlaced'
console.log(event.data);       // { orderId: 'order-1', amount: 99.99 }
console.log(event.meta?.id);   // UUID
```

### Engine Lifecycle

```
Command -> Load Events -> Rehydrate State -> Decide -> Commit -> Dispatch
           ^                                           |
        EventStore <-----------------------------------+
```

1. **Load Events**: Read all events for the stream from EventStore
2. **Rehydrate State**: Apply reducer to get current state
3. **Decide**: Run business logic (pure function) -> `Result<Events, Error>`
4. **Commit**: Append new events to EventStore (with optimistic locking)
5. **Dispatch**: Emit events for side effects (Reactors)

### Reactors (Side Effects)

React to events for side effects (send emails, call APIs, etc.):

```typescript
// Legacy style (still supported)
engine.addEventListener('OrderPlaced', (e) => {
  const event = e as OrderPlaced;
  sendConfirmationEmail(event.data.orderId);
});
```

### Type-Safe Event Listeners

Use the `on` method for type-safe event subscriptions:

```typescript
// Full type inference - no casting needed!
engine.on('ItemAdded', (event) => {
  // event.data is correctly typed as { itemId: string; quantity: number; price: number }
  console.log(event.data.itemId);
});

// Returns unsubscribe function
const unsubscribe = engine.on('OrderPlaced', handler);
unsubscribe(); // Clean up when done

// TypeScript catches typos at compile time
engine.on('InvalidEvent', ...); // ← Compile error!
```

### Domain Errors (Optional FP Style)

You can define errors as Plain Objects for consistent FP style:

```typescript
import { type DomainError, defineError, isDomainError } from 'rise';

// Define error types
type CartNotFound = DomainError<'CartNotFound', { cartId: string }>;
type InvalidQuantity = DomainError<'InvalidQuantity', { quantity: number }>;

// Create error factories
const cartNotFound = defineError('CartNotFound', (cartId: string) => ({
  message: `Cart "${cartId}" does not exist`,
  data: { cartId },
}));

const invalidQuantity = defineError('InvalidQuantity', (quantity: number) => ({
  message: `Quantity must be positive, got ${quantity}`,
  data: { quantity },
}));

// Usage in decider
const decider = (command, state): Result<Event[], CartNotFound | InvalidQuantity> => {
  if (!state.exists) {
    return err(cartNotFound(command.streamId));
  }
  if (command.quantity <= 0) {
    return err(invalidQuantity(command.quantity));
  }
  return ok([...]);
};

// Pattern matching
if (isDomainError(error, 'CartNotFound')) {
  console.log(error.data.cartId);
}
```

**Note:** You can also use class-based errors (extending Error) - the library doesn't force either style.

### Multiple Aggregates with Reactors

Events can cascade across different Aggregates via Reactors:

```typescript
// Order Aggregate
const orderEngine = new Engine<OrderCommand, OrderEvent, OrderState, OrderError>(...);

// Inventory Aggregate  
const inventoryEngine = new Engine<InventoryCommand, InventoryEvent, InventoryState, InventoryError>(...);

// Reactor: OrderPlaced → Reserve stock
orderEngine.on('OrderPlaced', async (event) => {
  await inventoryEngine.execute(
    reserveStock(event.data.productId, event.data.quantity, event.data.orderId)
  );
});

// Reactor: StockReserved → Confirm order
inventoryEngine.on('StockReserved', async (event) => {
  await orderEngine.execute(confirmOrder(event.data.orderId));
});
```

This pattern enables:
- **Loose coupling** - Aggregates don't know about each other directly
- **Event-driven architecture** - State changes propagate automatically  
- **Audit trail** - All interactions are recorded as events

### EventBus (Cross-Engine Communication)

For complex applications with multiple Engines, use EventBus to centralize event routing:

```typescript
import { Engine, EventBus, InMemoryEventStore } from 'rise';

// 1. Define all event types
type AllEvents = OrderEvent | InventoryEvent | PurchaseOrderEvent;

// 2. Create shared EventBus
const bus = new EventBus<AllEvents>({
  onError: (error, event) => console.error(`Error on ${event.type}:`, error),
});

// 3. Connect Engines to the bus
const orderEngine = new Engine(
  new InMemoryEventStore<OrderEvent>(),
  orderAggregate,
  { bus }  // ← Connect to shared bus
);

const inventoryEngine = new Engine(
  new InMemoryEventStore<InventoryEvent>(),
  inventoryAggregate,
  { bus }
);

// 4. Register Reactors on the bus (centralized event flow)
bus.on('OrderPlaced', async (event) => {
  // event.data is fully typed
  await inventoryEngine.execute(reserveStock(event.data.productId, event.data.quantity));
});

bus.on('StockReserved', async (event) => {
  await orderEngine.execute(confirmOrder(event.data.orderId));
});
```

Benefits of EventBus:
- **Centralized event flow** - All Reactors visible in one place
- **Type-safe across Engines** - Full type inference for all event types
- **Global error handling** - Catch async errors in Reactors
- **Loose coupling** - Engines don't know about each other

## Snapshot

For aggregates with many events, snapshots provide fast rehydration:

```typescript
import { Engine, InMemorySnapshotStore } from 'rise';

const snapshotStore = new InMemorySnapshotStore<CounterState>();

const engine = new Engine(eventStore, counterConfig, {
  snapshotStore,
  snapshotEvery: 100, // Auto-snapshot every 100 events (optional)
});

// Manual snapshot
await engine.snapshot('counter-1');

// On next execute(), state is loaded from snapshot + subsequent events
```

## Projection

Build read models from events:

```typescript
import { defineProjection, Projector, InMemoryProjectionStore } from 'rise';

// Define projection
const orderStats = defineProjection<Stats, OrderEvent>(
  'OrderStats',
  () => ({ total: 0, revenue: 0 }),
  (state, event) => {
    if (event.type === 'OrderConfirmed') {
      return { total: state.total + 1, revenue: state.revenue + event.data.amount };
    }
    return state;
  }
);

// Create projector
const store = new InMemoryProjectionStore<Stats>();
const projector = new Projector(orderStats, store, () => 'global');

// Process events
await projector.handle(event);

// Or rebuild from all events
await projector.rebuild(allEvents);

// Subscribe to EventBus for real-time updates
projector.subscribe(bus, ['OrderConfirmed', 'OrderCancelled']);
```

## API Reference

### Result

| Function | Description |
|----------|-------------|
| `ok(value)` | Create success result |
| `err(error)` | Create failure result |
| `isOk(result)` | Type guard for success |
| `isErr(result)` | Type guard for failure |
| `map(result, fn)` | Transform success value |
| `flatMap(result, fn)` | Chain Result-returning functions |

### DomainEvent

| Property | Description |
|----------|-------------|
| `type` | Event type string |
| `data` | Event payload |
| `meta.id` | Unique UUID |
| `meta.timestamp` | When event was created |

| Function | Description |
|----------|-------------|
| `createMeta(partial?)` | Create event metadata |
| `defineEvent(type, factory)` | Create typed event factory |

### DomainError

| Property | Description |
|----------|-------------|
| `tag` | Error type identifier |
| `message` | Human-readable error message |
| `data` | Optional error payload |

| Function | Description |
|----------|-------------|
| `defineError(tag, factory)` | Create typed error factory |
| `isDomainError(error, tag?)` | Type guard for DomainError |

### Engine

| Method | Description |
|--------|-------------|
| `execute(command)` | Run command through Event Sourcing cycle |
| `getState(streamId)` | Get current state for a stream |
| `on(type, handler)` | Type-safe event subscription (returns unsubscribe function) |
| `addEventListener(type, handler)` | Subscribe to events (from EventTarget) |

### EventBus

| Method | Description |
|--------|-------------|
| `new EventBus(options?)` | Create event bus with optional error handler |
| `on(type, handler)` | Type-safe event subscription (async handlers supported) |
| `publish(event)` | Publish event to all subscribers |
| `setErrorHandler(handler)` | Set/update global error handler |

### EventStore

Interface for persistence. Implement for your database:

```typescript
interface EventStore<TEvent> {
  readStream(streamId: string): Promise<TEvent[]>;
  appendToStream(streamId: string, events: TEvent[], expectedVersion: number): Promise<void>;
}
```

Built-in: `InMemoryEventStore` (for development/testing)

## Examples

### Counter (Minimal)
Single-file example demonstrating Event Sourcing basics in ~100 lines.

```bash
pnpm tsx examples/counter.ts
```

### Shopping Cart
Single-aggregate example with add/remove items (FP style).

```bash
pnpm tsx examples/cart/main.ts
```

See [examples/cart](./examples/cart) for details.

### Clean Architecture Pattern
Example showing how to structure RISE with Clean Architecture (Domain / Use Cases / Infrastructure layers).

```bash
pnpm tsx examples/clean-arch/main.ts
```

See [examples/clean-arch](./examples/clean-arch) for details.

### Order Flow (EventBus Pattern)
Multi-aggregate example showing event cascades: Order → Inventory → PurchaseOrder.

```bash
pnpm tsx examples/order-flow/main.ts
```

See [examples/order-flow](./examples/order-flow) for details.

## Philosophy

- **Functional Core, Imperative Shell**: Business logic (Decider, Reducer) is pure. Side effects are in the Engine.
- **Explicit over Implicit**: Errors are values, not exceptions.
- **Event Sourcing**: State is derived from events, never stored directly.
- **Plain Objects First**: Prefer simple data structures over classes.

## License

MIT
