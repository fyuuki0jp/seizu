# Order Flow Example

This example demonstrates **multiple Aggregates communicating via Reactors** - a key pattern in Event Sourcing.

## Architecture

```
┌─────────────┐     OrderPlaced      ┌─────────────────┐
│   Order     │─────────────────────▶│   Inventory     │
│  Aggregate  │                      │   Aggregate     │
└─────────────┘                      └─────────────────┘
      ▲                                      │
      │ ConfirmOrder                         │ StockReserved
      │                                      │
      └──────────────────────────────────────┘
                                             │
                                             │ StockDepleted (low stock)
                                             ▼
                                    ┌─────────────────┐
                                    │ PurchaseOrder   │
                                    │   Aggregate     │
                                    └─────────────────┘
```

## Event Flow

1. **PlaceOrder** command → **OrderPlaced** event
2. Reactor detects OrderPlaced → sends **ReserveStock** to Inventory
3. Inventory emits **StockReserved** (and **StockDepleted** if low)
4. Reactor detects StockReserved → sends **ConfirmOrder** to Order
5. If StockDepleted → Reactor sends **CreatePurchaseOrder**

## Run the Demo

```bash
pnpm tsx examples/order-flow/main.ts
```

## Expected Output

```
=== RISE Order Flow Demo ===

This demo shows how events cascade across multiple Aggregates via Reactors.

📦 Setting up initial inventory...
  ✅ Product "apple": 10 units in stock

--- Order 1: 3 apples ---
  📦 Order placed: order-001 (3x apple)
  ✅ Stock reserved: 3x apple for order order-001
  🎉 Order confirmed: order-001

--- Order 2: 4 apples ---
  📦 Order placed: order-002 (4x apple)
  ✅ Stock reserved: 4x apple for order order-002
  ⚠️  Stock depleted for apple! Remaining: 3
  📋 Purchase order created: po-apple-... (100x apple)
  📬 PO po-apple-... sent to supplier
  🎉 Order confirmed: order-002

--- Order 3: 5 apples (will fail) ---
  📦 Order placed: order-003 (5x apple)
  ❌ Failed to reserve stock: Insufficient stock for "apple": requested 5, available 3

=== Final States ===

Orders:
  - order-001: confirmed
  - order-002: confirmed
  - order-003: pending

Inventory (apple):
  - Available: 3
  - Reserved: 7

✨ Demo complete!
```

## Key Concepts Demonstrated

| Concept | Description |
|---------|-------------|
| **Reactor Pattern** | Events trigger commands in other Aggregates |
| **Loose Coupling** | Order doesn't know about Inventory directly |
| **Event Cascade** | One event can trigger a chain of events |
| **Audit Trail** | All state changes are recorded as events |
| **Type-Safe Events** | `engine.on('EventType', ...)` with full type inference |

## Files

```
order-flow/
├── main.ts              # Demo entry point
├── README.md            # This file
├── order/               # Order Aggregate
│   ├── events.ts        # OrderPlaced, OrderConfirmed
│   ├── commands.ts      # PlaceOrder, ConfirmOrder
│   ├── state.ts         # OrderState, reducer
│   ├── errors.ts        # OrderError types
│   └── decider.ts       # Business logic
├── inventory/           # Inventory Aggregate
│   ├── events.ts        # StockInitialized, StockReserved, StockDepleted
│   ├── commands.ts      # InitializeStock, ReserveStock
│   ├── state.ts         # InventoryState, reducer
│   ├── errors.ts        # InventoryError types
│   └── decider.ts       # Business logic (includes low stock detection)
└── purchase-order/      # PurchaseOrder Aggregate
    ├── events.ts        # PurchaseOrderCreated
    ├── commands.ts      # CreatePurchaseOrder
    ├── state.ts         # PurchaseOrderState, reducer
    ├── errors.ts        # PurchaseOrderError types
    └── decider.ts       # Business logic
```
