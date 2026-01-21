# Cart Example

A shopping cart domain implemented with RISE.

## Run

```bash
pnpm tsx examples/cart/main.ts
```

## Expected Output

```
=== RISE Cart Demo ===

✅ Cart created for user: user-alice
  📦 Added 3x apple @ $1.5
  📦 Added 2x banana @ $0.75
  📦 Added 2x apple @ $1.5
  🗑️  Removed item: banana

⚠️  Expected error: Item "orange" is not in the cart

=== Final Cart State ===
Items:
  - apple: 5 x $1.5 = $7.5

Total: $7.50
```

## Structure

- `events.ts` - Domain events (what happened)
- `commands.ts` - Commands (user intentions)
- `state.ts` - State and reducer (pure function)
- `errors.ts` - Domain errors (business rule violations)
- `decider.ts` - Business logic (pure function)
- `main.ts` - Demo execution
