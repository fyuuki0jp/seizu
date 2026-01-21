import { describe, test, expect, vi } from 'vitest';
import { EventBus, createMeta } from '../src';
import type { DomainEvent } from '../src';

// Test events using Plain Object style
type TestEvent = DomainEvent<'TestEvent', { value: number }>;
type AnotherEvent = DomainEvent<'AnotherEvent', { message: string }>;

const createTestEvent = (value: number): TestEvent => ({
  type: 'TestEvent',
  data: { value },
  meta: createMeta(),
});

const createAnotherEvent = (message: string): AnotherEvent => ({
  type: 'AnotherEvent',
  data: { message },
  meta: createMeta(),
});

type AllEvents = TestEvent | AnotherEvent;

describe('EventBus', () => {
  test('publishes and receives events', () => {
    const bus = new EventBus<AllEvents>();
    const received: number[] = [];

    bus.on('TestEvent', (event) => {
      received.push(event.data.value);
    });

    bus.publish(createTestEvent(42));
    bus.publish(createTestEvent(100));

    expect(received).toEqual([42, 100]);
  });

  test('type-safe event subscription', () => {
    const bus = new EventBus<AllEvents>();
    
    bus.on('TestEvent', (event) => {
      // event.data should be { value: number }
      const value: number = event.data.value;
      expect(typeof value).toBe('number');
    });

    bus.on('AnotherEvent', (event) => {
      // event.data should be { message: string }
      const message: string = event.data.message;
      expect(typeof message).toBe('string');
    });

    bus.publish(createTestEvent(1));
    bus.publish(createAnotherEvent('hello'));
  });

  test('unsubscribe function works', () => {
    const bus = new EventBus<AllEvents>();
    const received: number[] = [];

    const unsubscribe = bus.on('TestEvent', (event) => {
      received.push(event.data.value);
    });

    bus.publish(createTestEvent(1));
    unsubscribe();
    bus.publish(createTestEvent(2));

    expect(received).toEqual([1]);
  });

  test('async handler errors are caught with local handler', async () => {
    const bus = new EventBus<AllEvents>();
    const errors: unknown[] = [];

    bus.on(
      'TestEvent',
      async () => {
        throw new Error('async error');
      },
      {
        onError: (error) => {
          errors.push(error);
        },
      }
    );

    bus.publish(createTestEvent(1));

    // Wait for async handler
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(errors.length).toBe(1);
    expect((errors[0] as Error).message).toBe('async error');
  });

  test('global error handler catches all errors', async () => {
    const errors: unknown[] = [];
    const bus = new EventBus<AllEvents>({
      onError: (error) => {
        errors.push(error);
      },
    });

    bus.on('TestEvent', async () => {
      throw new Error('error 1');
    });

    bus.on('AnotherEvent', async () => {
      throw new Error('error 2');
    });

    bus.publish(createTestEvent(1));
    bus.publish(createAnotherEvent('hello'));

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(errors.length).toBe(2);
  });

  test('error event is dispatched on handler failure', async () => {
    const bus = new EventBus<AllEvents>();
    const errorEvents: CustomEvent[] = [];

    bus.addEventListener('error', (e) => {
      errorEvents.push(e as CustomEvent);
    });

    bus.on('TestEvent', async () => {
      throw new Error('test error');
    });

    bus.publish(createTestEvent(1));

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(errorEvents.length).toBe(1);
    expect(errorEvents[0].detail.error.message).toBe('test error');
  });

  test('works with events without meta', () => {
    const bus = new EventBus<AllEvents>();
    const received: number[] = [];

    bus.on('TestEvent', (event) => {
      received.push(event.data.value);
    });

    // Event without meta - should still work
    bus.publish({ type: 'TestEvent', data: { value: 99 } });

    expect(received).toEqual([99]);
  });
});
