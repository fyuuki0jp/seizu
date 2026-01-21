import type { AggregateConfig } from '../../../src';
import type { InventoryCommand } from './commands';
import { decider } from './decider';
import type { InventoryError } from './errors';
import type { InventoryEvent } from './events';
import type { InventoryState } from './state';
import { initialState, reducer } from './state';

export const inventoryAggregate: AggregateConfig<
  InventoryCommand,
  InventoryEvent,
  InventoryState,
  InventoryError
> = {
  initialState,
  reducer,
  decider,
};

// Re-export types
export type {
  InventoryCommand,
  InventoryEvent,
  InventoryState,
  InventoryError,
};

// Re-export command factories
export { initializeStock, releaseStock, reserveStock } from './commands';

// Re-export event types and factories
export type {
  StockDepleted,
  StockInitialized,
  StockReleased,
  StockReserved,
} from './events';
export {
  createStockDepleted,
  createStockInitialized,
  createStockReleased,
  createStockReserved,
} from './events';
