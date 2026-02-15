# seizu

**State Engine for Invariant-driven Zero-defect Unification**

seizu (星図) is a contract-based state transition library for TypeScript. Define `{ pre, transition, post, invariant }` with `define()` to get both an executable function and PBT-verifiable metadata from a single declaration.

## Install

```bash
npm install seizu
```

## Quick Start

```typescript
import { define, guard, check, ensure, ok, err, pass } from 'seizu';

type State = { count: number };
type Input = { amount: number };
type Err = 'NEGATIVE_RESULT';

const add = define<State, Input, Err>('add', {
  pre: [
    guard('amount must be positive', (_s, input) =>
      input.amount > 0 ? pass : err('NEGATIVE_RESULT')
    ),
  ],
  transition: (state, input) => ({
    count: state.count + input.amount,
  }),
  post: [
    check('count increases', (before, after) =>
      after.count > before.count ? true : 'count did not increase'
    ),
  ],
  invariant: [
    ensure('count is non-negative', (state) =>
      state.count >= 0 ? true : 'count is negative'
    ),
  ],
});

// Execute as a function — returns Result<State, Err>
const result = add({ count: 0 }, { amount: 5 });
if (result.ok) {
  console.log(result.value); // { count: 5 }
}
```

### Scenario

Compose multiple contracts into a sequential workflow:

```typescript
import { scenario, step } from 'seizu';

const deposit = define<Account, DepositInput, BankError>('deposit', { /* ... */ });
const withdraw = define<Account, WithdrawInput, BankError>('withdraw', { /* ... */ });

const transfer = scenario<Account, TransferInput, BankError>(
  'transfer',
  (input) => [
    step(withdraw, { amount: input.amount }),
    step(deposit, { amount: input.amount }),
  ]
);
```

## Sub-exports

### `seizu/testing`

Test helpers for asserting Result values:

```typescript
import { expectOk, expectErr } from 'seizu/testing';

const result = add({ count: 0 }, { amount: 5 });
const state = expectOk(result); // throws if err
```

### `seizu/verify`

Property-Based Testing verification powered by [fast-check](https://github.com/dubzzz/fast-check):

```typescript
import { assertContractValid } from 'seizu/verify';
import fc from 'fast-check';

assertContractValid(add, {
  state: fc.record({ count: fc.nat() }),
  input: fc.record({ amount: fc.integer({ min: 1, max: 100 }) }),
});
```

> `fast-check` is an optional peer dependency — install it only when using `seizu/verify`.

## Contract Mode

seizu supports two runtime modes:

- **`production`** (default) — Executes pre-conditions and transition only. Fast.
- **`strict`** — Also checks post-conditions, invariants, and wraps transition errors in `TransitionPanic`. Use for testing and development.

```typescript
import { setContractMode } from 'seizu';

setContractMode('strict');
```

## License

MIT
