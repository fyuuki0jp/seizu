# AGENTS.md - RISE Framework

Guidelines for AI coding agents working in this repository.

## Project Overview

RISE (Reactive Immutable State Engine) is a zero-dependency TypeScript library for Event Sourcing with Railway Oriented Programming.

## Build/Lint/Test Commands

```bash
# Package manager: pnpm (v10.18.0+)
pnpm install          # Install dependencies
pnpm build            # Build with tsup (ESM + CJS)

# Lint & Format (Biome)
pnpm lint             # Check linting issues
pnpm lint:fix         # Fix linting issues
pnpm format           # Format code

# Test (Vitest)
pnpm test                                       # Run all tests
pnpm vitest run tests/engine.test.ts            # Run single test file
pnpm vitest run -t "execute processes command"  # Run test by name pattern

# Run examples
pnpm tsx examples/counter.ts
pnpm tsx examples/cart/main.ts
```

## Code Style Guidelines

### Formatting (Biome)

- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: Always required
- **Trailing commas**: ES5 style

### Imports

- Use `type` imports for types: `import type { Result } from './result'`
- Prefer named exports over default exports
- Organize imports automatically (Biome handles this)

### Types & TypeScript

- **Target**: ES2022, strict mode enabled
- **No unused imports/variables** (enforced by Biome)
- Use `readonly` for immutable properties
- Prefer interfaces for object shapes, type aliases for unions
- Use generics with descriptive names: `TEvent`, `TState`, `TCommand`

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Types/Interfaces | PascalCase | `DomainEvent`, `CartState` |
| Classes | PascalCase | `Engine`, `EventBus` |
| Functions | camelCase | `createMeta`, `defineEvent` |
| Files | kebab-case | `event-bus.ts`, `in-memory-store.ts` |
| Event types | PascalCase, past tense | `CartCreated`, `ItemAdded` |
| Command types | PascalCase, imperative | `CreateCart`, `AddItem` |
| Error classes | PascalCase + "Error" | `CartNotFoundError` |

### Error Handling (Railway Oriented Programming)

```typescript
import { ok, err, isOk, type Result } from 'rise';

// Return Result instead of throwing
const decider = (command: Command, state: State): Result<Event[], Error> => {
  if (!state.exists) return err(new NotFoundError(command.streamId));
  return ok([createEvent(command)]);
};

// Handle results with type guards
if (isOk(result)) {
  console.log(result.value);
} else {
  console.log(result.error);
}
```

### Domain Error Pattern (Class-based)

```typescript
export class CartNotFoundError extends Error {
  readonly _tag = 'CartNotFoundError';
  constructor(cartId: string) {
    super(`Cart "${cartId}" does not exist`);
    this.name = 'CartNotFoundError';
  }
}
```

### Event Sourcing Patterns

```typescript
// Event type definition
type ItemAdded = DomainEvent<'ItemAdded', { itemId: string; quantity: number }>;

// Factory function
const createItemAdded = (itemId: string, quantity: number): ItemAdded => ({
  type: 'ItemAdded',
  data: { itemId, quantity },
  meta: createMeta(),
});
```

### Aggregate Structure

```
examples/cart/
├── commands.ts   # Command types and factories
├── decider.ts    # Business logic (pure function)
├── errors.ts     # Domain errors
├── events.ts     # Event types and factories
├── main.ts       # Entry point
└── state.ts      # State type and reducer
```

### Decider Pattern

```typescript
export const decider = (
  command: CartCommand,
  state: CartState
): Result<CartEvent[], CartError> => {
  switch (command.type) {
    case 'AddItem':
      if (!state.exists) return err(new CartNotFoundError(command.streamId));
      return ok([createItemAdded(command.itemId, command.quantity)]);
    default:
      const _exhaustive: never = command;
      return _exhaustive;
  }
};
```

### Testing Patterns

```typescript
import { beforeEach, describe, expect, test } from 'vitest';

describe('Engine', () => {
  let engine: Engine<Command, Event, State, Error>;

  beforeEach(() => {
    engine = new Engine(new InMemoryEventStore(), config);
  });

  test('execute processes command and stores events', async () => {
    const result = await engine.execute({ type: 'Increment', streamId: 'id-1', amount: 5 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
    }
  });
});
```

## Project Architecture

```
src/
├── index.ts              # Public API exports
├── core/                 # Core implementations
│   ├── engine.ts         # Main Engine class
│   ├── event-bus.ts      # EventBus for cross-engine communication
│   ├── event-store.ts    # EventStore interface
│   ├── in-memory-store.ts
│   ├── projection.ts     # Projection interfaces
│   └── projector.ts      # Projector implementation
└── lib/                  # Utilities and primitives
    ├── events.ts         # DomainEvent, createMeta, defineEvent
    ├── errors.ts         # DomainError, defineError
    ├── result.ts         # Result type, ok, err, isOk, isErr
    └── projections.ts    # defineProjection helper
```

## Key Principles

1. **Zero Dependencies** - Only use standard Web APIs (EventTarget, CustomEvent, crypto)
2. **Functional Core, Imperative Shell** - Business logic (decider, reducer) is pure
3. **Explicit Errors** - Use Result types, not exceptions
4. **Plain Objects First** - Prefer simple data structures over classes
5. **Type Safety** - Leverage TypeScript's type system fully

## Event Dispatch Contract

### Invariant: originalEvent プロパティの保証

RISE の内部実装では、`EventTarget` API を使用したイベント dispatch において、以下の不変条件 (invariant) を保証しています：

**不変条件**: `wrapAsCustomEvent()` 関数は **常に** `originalEvent` プロパティを CustomEvent に設定する

```typescript
export const wrapAsCustomEvent = <E extends DomainEvent>(
  event: E
): WrappedCustomEvent<E> => {
  const ce = new CustomEvent(event.type, { detail: event.data }) as WrappedCustomEvent<E>;
  ce.originalEvent = event; // ✅ 必ず設定される
  return ce;
};
```

### Fail Fast アプローチ

`Engine.on()` および `EventBus.on()` では、この不変条件が守られていることを前提としており、違反時には即座に Error をスローします：

```typescript
const listener = (e: Event) => {
  const customEvent = e as CustomEvent & { originalEvent?: DomainEvent };
  
  // Fail Fast: originalEvent は不変条件、欠損はプログラミングエラー
  if (!customEvent.originalEvent) {
    throw new Error(
      `Event "${e.type}" was dispatched without originalEvent. ` +
      `This indicates a programming error. Use Engine.execute() to dispatch events.`
    );
  }
  
  handler(customEvent.originalEvent as ToEventMap<TEvent>[K]);
};
```

### ユーザーへの契約

ユーザーは以下のルールを守る必要があります：

1. **イベントの dispatch は公開 API を使用する**:
   - `Engine.execute(command)` または `EventBus.publish(event)` を使用
   - **直接 `dispatchEvent()` を呼び出さない**

2. **契約違反時の動作**:
   - `originalEvent` が欠損している場合、即座に Error がスローされる
   - エラーメッセージでプログラミングエラーであることを明示

### 設計判断の理由

**なぜフォールバックを削除したか**:

以前のコードでは、`originalEvent` が欠損した場合にフォールバックで代替オブジェクトを作成していました：

```typescript
const event = customEvent.originalEvent ?? {
  type: e.type,
  data: (e as CustomEvent).detail,
}; // ❌ Over-Validation
```

**問題点**:
- フォールバックで作成されるオブジェクトは `meta` フィールドが欠損（不完全）
- バグを隠蔽し、問題の発見を遅らせる
- `originalEvent` は内部実装の不変条件であり、欠損は開発者のミス

**新しいアプローチ (Fail Fast)**:
- 不変条件違反を即座に検出
- 明確なエラーメッセージで問題箇所を特定
- 型レベルでの保証 (`WrappedCustomEvent` 型)

詳細は [`docs/DEFENSIVE_CODING.md`](./docs/DEFENSIVE_CODING.md) を参照してください。
