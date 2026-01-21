import { describe, test, expect } from 'vitest';
import { createMeta, defineEvent, DomainEventClass } from '../src/lib/events';
import type { DomainEvent } from '../src/lib/events';

describe('createMeta', () => {
  test('generates UUID for id', () => {
    const meta = createMeta();
    expect(meta.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  test('generates timestamp', () => {
    const before = new Date();
    const meta = createMeta();
    const after = new Date();
    expect(meta.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(meta.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  test('accepts custom values', () => {
    const customId = 'custom-id-123';
    const customTime = new Date('2024-01-01');
    const meta = createMeta({ id: customId, timestamp: customTime });
    expect(meta.id).toBe(customId);
    expect(meta.timestamp).toBe(customTime);
  });

  test('accepts additional metadata', () => {
    const meta = createMeta({ correlationId: 'corr-123' });
    expect(meta.correlationId).toBe('corr-123');
  });
});

describe('defineEvent', () => {
  test('creates event factory with correct type and data', () => {
    const userCreated = defineEvent(
      'UserCreated',
      (name: string, email: string) => ({ name, email })
    );

    const event = userCreated('Alice', 'alice@example.com');

    expect(event.type).toBe('UserCreated');
    expect(event.data).toEqual({ name: 'Alice', email: 'alice@example.com' });
    expect(event.meta).toBeDefined();
    expect(event.meta?.id).toMatch(/^[0-9a-f-]+$/i);
  });

  test('creates event factory with no args', () => {
    const sessionStarted = defineEvent('SessionStarted', () => ({}));
    const event = sessionStarted();

    expect(event.type).toBe('SessionStarted');
    expect(event.data).toEqual({});
  });
});

describe('Plain Object DomainEvent', () => {
  test('can be created as plain object', () => {
    const event: DomainEvent<'TestEvent', { message: string }> = {
      type: 'TestEvent',
      data: { message: 'hello' },
      meta: createMeta(),
    };

    expect(event.type).toBe('TestEvent');
    expect(event.data).toEqual({ message: 'hello' });
    expect(event.meta?.id).toBeDefined();
  });

  test('works without meta', () => {
    const event: DomainEvent<'TestEvent', { value: number }> = {
      type: 'TestEvent',
      data: { value: 42 },
    };

    expect(event.type).toBe('TestEvent');
    expect(event.data.value).toBe(42);
    expect(event.meta).toBeUndefined();
  });
});

describe('DomainEventClass (legacy)', () => {
  test('creates event with type and data', () => {
    const event = new DomainEventClass('TestEvent', { message: 'hello' });
    expect(event.type).toBe('TestEvent');
    expect(event.data).toEqual({ message: 'hello' });
    expect(event.detail).toEqual({ message: 'hello' });
  });

  test('generates UUID for meta.id', () => {
    const event = new DomainEventClass('Test', {});
    expect(event.meta.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  test('generates timestamp', () => {
    const before = new Date();
    const event = new DomainEventClass('Test', {});
    const after = new Date();
    expect(event.meta.timestamp.getTime()).toBeGreaterThanOrEqual(
      before.getTime()
    );
    expect(event.meta.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  test('can be dispatched and received on EventTarget', () => {
    const target = new EventTarget();
    const received: string[] = [];

    target.addEventListener('UserCreated', (e) => {
      const event = e as DomainEventClass<'UserCreated', { name: string }>;
      received.push(event.data.name);
    });

    target.dispatchEvent(new DomainEventClass('UserCreated', { name: 'Alice' }));
    target.dispatchEvent(new DomainEventClass('UserCreated', { name: 'Bob' }));

    expect(received).toEqual(['Alice', 'Bob']);
  });

  test('accepts custom meta', () => {
    const customId = 'custom-id-123';
    const customTime = new Date('2024-01-01');
    const event = new DomainEventClass(
      'Test',
      {},
      { id: customId, timestamp: customTime }
    );
    expect(event.meta.id).toBe(customId);
    expect(event.meta.timestamp).toBe(customTime);
  });

  test('satisfies DomainEvent interface', () => {
    const classEvent = new DomainEventClass('TestEvent', { value: 42 });
    
    // Should be assignable to DomainEvent interface
    const event: DomainEvent<'TestEvent', { value: number }> = classEvent;
    
    expect(event.type).toBe('TestEvent');
    expect(event.data.value).toBe(42);
  });
});
