// RISE - Reactive Immutable State Engine

// Result type (Railway Oriented Programming)
export { type Result, ok, err, map, flatMap, isOk, isErr } from './lib/result';

// Domain Events (Plain Object based)
export { 
  type EventMeta, 
  type DomainEvent,
  type ToEventMap, 
  type EventType,
  createMeta,
  defineEvent,
  // Legacy class support (deprecated)
  DomainEventClass,
} from './lib/events';

// Event Store
export { type EventStore } from './core/event-store';
export { InMemoryEventStore } from './core/in-memory-store';

// Engine
export {
  type AggregateConfig,
  type Command,
  type EngineOptions,
  type EventPublisher,
  type InferCommand,
  type InferEvent,
  type InferState,
  type InferError,
  Engine
} from './core/engine';

// Event Bus
export { EventBus, type EventBusOptions, type ReactorErrorHandler } from './core/event-bus';

// Domain Errors (Plain Object based)
export {
  type DomainError,
  defineError,
  isDomainError,
} from './lib/errors';

// Snapshot
export { type Snapshot, type SnapshotStore } from './core/snapshot-store';
export { InMemorySnapshotStore } from './core/in-memory-snapshot-store';

// Projection
export { type Projection, type ProjectionStore } from './core/projection';
export { InMemoryProjectionStore } from './core/in-memory-projection-store';
export { defineProjection } from './lib/projections';
export { Projector } from './core/projector';
