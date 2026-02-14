# AGENTS.md - RISE v2

Guidelines for AI coding agents working in this repository.

## Project Overview

RISE is a contract-based state transition library for TypeScript. It lets you declare `{ pre, transition, post, invariant }` once with `define()`, producing both an executable function and verifiable metadata.

- `rise` - Core library (zero dependencies): `define()`, `Result`, `Guard`, `Condition`, `Invariant`
- `rise-verify` - PBT verification CLI (fast-check): automated contract verification

## Monorepo Structure

```
packages/
├── rise/                  # Core library
│   ├── src/
│   │   ├── result.ts     # Result<T,E>, ok, err, isOk, isErr, map, flatMap, match
│   │   ├── types.ts      # Guard, Condition, Invariant, ContractDef, Contract
│   │   ├── define.ts     # define() function
│   │   └── index.ts      # re-export
│   └── tests/
└── rise-verify/           # PBT verification CLI
    ├── src/
    │   ├── config.ts      # Config loading
    │   ├── runner.ts      # fast-check verification
    │   ├── reporter/      # summary, json, replay
    │   ├── cli.ts         # CLI entry
    │   └── index.ts       # Programmatic API
    └── tests/
examples/
└── cart/                  # Cart example
```

## Build/Lint/Test Commands

```bash
# Package manager: pnpm (v10.18.0+), turbo for task orchestration
pnpm install              # Install dependencies
pnpm build                # Build all packages (turbo)
pnpm test                 # Test all packages (turbo)

# Per-package
pnpm --filter rise build
pnpm --filter rise test
pnpm --filter rise-verify build
pnpm --filter rise-verify test

# Lint & Format (Biome)
pnpm lint                 # Check linting issues
pnpm lint:fix             # Fix linting issues
pnpm format               # Format code

# Run examples
npx tsx --tsconfig examples/tsconfig.json examples/cart/main.ts
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
- Use generics with descriptive names: `TState`, `TInput`, `TError`

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Types/Interfaces | PascalCase | `Guard`, `CartState` |
| Functions | camelCase | `define`, `isOk` |
| Files | kebab-case or dot-case | `result.ts`, `define.ts` |
| Contract IDs | dot-separated | `cart.addItem`, `cart.create` |
| Error tags | PascalCase | `CartNotFound`, `DuplicateItem` |

### Error Pattern (Plain Object Discriminated Union)

```typescript
type CartNotFound = { readonly tag: 'CartNotFound' };
type DuplicateItem = { readonly tag: 'DuplicateItem'; readonly itemId: string };
type CartError = CartNotFound | DuplicateItem;
```

### Contract Pattern

```typescript
import { define } from 'rise';

export const addItem = define<CartState, AddItemInput, CartError>({
  id: 'cart.addItem',
  pre: [
    { id: 'cart.exists', check: (s) => s.exists, error: () => ({ tag: 'CartNotFound' }) },
    { id: 'item.unique', check: (s, i) => !s.items.has(i.itemId), error: (_, i) => ({ tag: 'DuplicateItem', itemId: i.itemId }) },
  ],
  transition: (state, input) => ({
    ...state,
    items: new Map([...state.items, [input.itemId, { qty: input.qty, price: input.price }]]),
  }),
  post: [{ id: 'count.up', check: (before, after) => after.items.size === before.items.size + 1 }],
  invariant: [{ id: 'qty.positive', check: (s) => [...s.items.values()].every((i) => i.qty > 0) }],
});
```

### Testing Patterns

```typescript
import { describe, expect, test } from 'vitest';
import { define, isOk, isErr } from 'rise';

describe('cart.addItem', () => {
  test('adds item to existing cart', () => {
    const result = addItem(activeCart, { itemId: 'apple', qty: 3, price: 1.5 });
    expect(isOk(result)).toBe(true);
  });
});
```

## Key Principles

1. **Zero Dependencies** (`rise` package) - No runtime dependencies
2. **Plain Objects + Functions** - No classes, no builder patterns, no DSLs
3. **Explicit Errors** - Use `Result<T, E>` types, not exceptions
4. **Contracts as Code** - Pre/post/invariant declared alongside transitions
5. **Verification by PBT** - `rise-verify` uses fast-check to find violations automatically
