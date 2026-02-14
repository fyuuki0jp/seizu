# AGENTS.md - kata (型)

Guidelines for AI coding agents working in this repository.

## Project Overview

kata (型) is a contract-based state transition library for TypeScript. It lets you declare `{ pre, transition, post, invariant }` once with `define()`, producing both an executable function and verifiable metadata. The name kata (型) embodies three meanings: martial arts kata (prescribed forms = scenarios), manufacturing mold (contracts that shape implementations), and type (TypeScript type safety).

- `kata` - Core library (zero dependencies): `define()`, `Result`, `Guard`, `Condition`, `Invariant`
- `kata-cli` - CLI tool: document generation, PBT verification, coverage analysis

## Monorepo Structure

```
packages/
├── kata/                  # Core library
│   ├── src/
│   │   ├── result.ts     # Result<T,E>, ok, err, isOk, isErr, map, flatMap, match
│   │   ├── types.ts      # Guard, Condition, Invariant, ContractDef, Contract
│   │   ├── define.ts     # define() function
│   │   └── index.ts      # re-export
│   └── tests/
└── kata-cli/              # CLI tool
    ├── src/
    │   ├── commands/      # doc, verify, coverage commands
    │   ├── doc/           # Document generation (parser, linker, renderer, i18n)
    │   ├── verify/        # PBT verification (config, reporters)
    │   ├── coverage/      # Coverage reporters
    │   └── cli.ts         # CLI entry
    └── tests/
```

## Build/Lint/Test Commands

```bash
# Package manager: pnpm (v10.18.0+), turbo for task orchestration
pnpm install              # Install dependencies
pnpm build                # Build all packages (turbo)
pnpm test                 # Test all packages (turbo)

# Per-package
pnpm --filter kata build
pnpm --filter kata test
pnpm --filter kata-cli build
pnpm --filter kata-cli test

# Lint & Format (Biome)
pnpm lint                 # Check linting issues
pnpm lint:fix             # Fix linting issues
pnpm format               # Format code
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
import { define } from 'kata';

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
import { define, isOk, isErr } from 'kata';

describe('cart.addItem', () => {
  test('adds item to existing cart', () => {
    const result = addItem(activeCart, { itemId: 'apple', qty: 3, price: 1.5 });
    expect(isOk(result)).toBe(true);
  });
});
```

## Key Principles

1. **Zero Dependencies** (`kata` package) - No runtime dependencies
2. **Plain Objects + Functions** - No classes, no builder patterns, no DSLs
3. **Explicit Errors** - Use `Result<T, E>` types, not exceptions
4. **Contracts as Code** - Pre/post/invariant declared alongside transitions
5. **Verification by PBT** - `kata-cli verify` uses fast-check to find violations automatically
