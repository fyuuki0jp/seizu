import { describe, expect, test } from 'vitest';
import type { DomainEvent } from '../src/lib/events';
import { createMeta, defineEvent } from '../src/lib/events';

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
