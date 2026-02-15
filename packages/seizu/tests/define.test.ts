import { describe, expect, test, vi } from 'vitest';
import {
  define,
  InvariantViolation,
  PostconditionViolation,
  TransitionPanic,
} from '../src/define';
import type { Result } from '../src/result';
import { err, pass } from '../src/result';
import { expectErr, expectOk } from '../src/testing';
import { check, ensure, guard } from '../src/types';

type State = { value: number };
type Input = { amount: number };
type Err = { tag: string };

describe('define', () => {
  test('returns ok when all guards pass', () => {
    const contract = define<State, Input, Err>('test.add', {
      pre: [
        guard('positive', (_s, i) =>
          i.amount > 0 ? pass : err({ tag: 'NotPositive' })
        ),
      ],
      transition: (state, input) => ({ value: state.value + input.amount }),
    });

    const state = expectOk(contract({ value: 10 }, { amount: 5 }));
    expect(state).toEqual({ value: 15 });
  });

  test('returns err when first guard fails', () => {
    const contract = define<State, Input, Err>('test.add', {
      pre: [
        guard('positive', (_s, i) =>
          i.amount > 0 ? pass : err({ tag: 'NotPositive' })
        ),
        guard('under limit', (_s, i) =>
          i.amount <= 100 ? pass : err({ tag: 'OverLimit' })
        ),
      ],
      transition: (state, input) => ({ value: state.value + input.amount }),
    });

    const error = expectErr(contract({ value: 10 }, { amount: -1 }));
    expect(error).toEqual({ tag: 'NotPositive' });
  });

  test('returns err from second guard with short-circuit evaluation', () => {
    const firstGuard = guard(
      'first',
      vi.fn((): Result<void, Err> => pass)
    );
    const secondGuard = guard(
      'second',
      vi.fn((): Result<void, Err> => err({ tag: 'Second' }))
    );
    const thirdGuard = guard(
      'third',
      vi.fn((): Result<void, Err> => pass)
    );

    const contract = define<State, Input, Err>('test.shortcircuit', {
      pre: [firstGuard, secondGuard, thirdGuard],
      transition: (state) => state,
    });

    const error = expectErr(contract({ value: 0 }, { amount: 0 }));
    expect(error).toEqual({ tag: 'Second' });

    expect(firstGuard.fn).toHaveBeenCalledOnce();
    expect(secondGuard.fn).toHaveBeenCalledOnce();
    expect(thirdGuard.fn).not.toHaveBeenCalled();
  });

  test('returns ok when guard array is empty', () => {
    const contract = define<State, Input, Err>('test.noguards', {
      pre: [],
      transition: (state, input) => ({ value: state.value + input.amount }),
    });

    const state = expectOk(contract({ value: 10 }, { amount: 5 }));
    expect(state).toEqual({ value: 15 });
  });

  test('is callable as a function', () => {
    const contract = define<State, Input, Err>('test.callable', {
      pre: [],
      transition: (state, input) => ({ value: state.value + input.amount }),
    });

    expect(typeof contract).toBe('function');
    expectOk(contract({ value: 1 }, { amount: 2 }));
  });

  test('exposes contract metadata via property access', () => {
    const pre = [guard('always pass', (): Result<void, Err> => pass)];
    const post = [{ label: 'always true', fn: () => true }];
    const inv = [{ label: 'always true', fn: () => true }];

    const contract = define<State, Input, Err>('test.metadata', {
      pre,
      transition: (state) => state,
      post,
      invariant: inv,
    });

    expect(contract.name).toBe('test.metadata');
    expect(contract.pre).toBe(pre);
    expect(contract.post).toBe(post);
    expect(contract.invariant).toBe(inv);
    expect(typeof contract.transition).toBe('function');
  });

  test('post and invariant are not evaluated at runtime', () => {
    const postCheck = vi.fn((): boolean => {
      throw new Error('post should not be called');
    });
    const invariantCheck = vi.fn((): boolean => {
      throw new Error('invariant should not be called');
    });

    const contract = define<State, Input, Err>('test.no-runtime-eval', {
      pre: [],
      transition: (state, input) => ({ value: state.value + input.amount }),
      post: [{ label: 'post', fn: postCheck }],
      invariant: [{ label: 'inv', fn: invariantCheck }],
    });

    expectOk(contract({ value: 1 }, { amount: 2 }));
    expect(postCheck).not.toHaveBeenCalled();
    expect(invariantCheck).not.toHaveBeenCalled();
  });

  test('guard error can use state and input', () => {
    const contract = define<State, Input, { tag: string; detail: string }>(
      'test.error-args',
      {
        pre: [
          guard('always fail', (state, input) =>
            err({
              tag: 'Failed',
              detail: `state=${state.value},input=${input.amount}`,
            })
          ),
        ],
        transition: (state) => state,
      }
    );

    const error = expectErr(contract({ value: 42 }, { amount: 7 }));
    expect(error.detail).toBe('state=42,input=7');
  });
});

describe('strict mode', () => {
  test('transition throw → TransitionPanic with cause', () => {
    const contract = define<State, Input, Err>(
      'test.panic',
      {
        pre: [],
        transition: () => {
          throw new Error('boom');
        },
      },
      { mode: 'strict' }
    );

    expect(() => contract({ value: 0 }, { amount: 1 })).toThrow(
      TransitionPanic
    );

    try {
      contract({ value: 0 }, { amount: 1 });
    } catch (e) {
      expect(e).toBeInstanceOf(TransitionPanic);
      expect((e as TransitionPanic).cause).toBeInstanceOf(Error);
      expect((e as TransitionPanic).message).toContain('test.panic');
      expect((e as TransitionPanic).message).toContain('boom');
    }
  });

  test('postcondition violation → PostconditionViolation', () => {
    const contract = define<State, Input, Err>(
      'test.postViolation',
      {
        pre: [],
        transition: (state, input) => ({ value: state.value + input.amount }),
        post: [
          check(
            'always negative',
            (_before, after) =>
              after.value < 0 || `value ${after.value} is not negative`
          ),
        ],
      },
      { mode: 'strict' }
    );

    expect(() => contract({ value: 0 }, { amount: 5 })).toThrow(
      PostconditionViolation
    );

    try {
      contract({ value: 0 }, { amount: 5 });
    } catch (e) {
      expect(e).toBeInstanceOf(PostconditionViolation);
      expect((e as PostconditionViolation).message).toContain(
        'always negative'
      );
      expect((e as PostconditionViolation).message).toContain(
        'value 5 is not negative'
      );
    }
  });

  test('invariant violation → InvariantViolation', () => {
    const contract = define<State, Input, Err>(
      'test.invViolation',
      {
        pre: [],
        transition: (state, input) => ({ value: state.value + input.amount }),
        invariant: [
          ensure(
            'non-negative',
            (s) => s.value >= 0 || `value ${s.value} is negative`
          ),
        ],
      },
      { mode: 'strict' }
    );

    expect(() => contract({ value: -10 }, { amount: 5 })).toThrow(
      InvariantViolation
    );

    try {
      contract({ value: -10 }, { amount: 5 });
    } catch (e) {
      expect(e).toBeInstanceOf(InvariantViolation);
      expect((e as InvariantViolation).message).toContain('non-negative');
      expect((e as InvariantViolation).message).toContain(
        'value -5 is negative'
      );
    }
  });

  test('production mode (default) does not evaluate post/invariant', () => {
    const postCheck = vi.fn((): true => {
      throw new Error('post should not be called');
    });

    const contract = define<State, Input, Err>('test.production', {
      pre: [],
      transition: (state, input) => ({ value: state.value + input.amount }),
      post: [{ label: 'post', fn: postCheck }],
    });

    expectOk(contract({ value: 1 }, { amount: 2 }));
    expect(postCheck).not.toHaveBeenCalled();
  });

  test('strict mode evaluates post/invariant on success', () => {
    const contract = define<State, Input, Err>(
      'test.strictOk',
      {
        pre: [],
        transition: (state, input) => ({ value: state.value + input.amount }),
        post: [
          check(
            'value increases',
            (before, after) =>
              after.value > before.value || 'value did not increase'
          ),
        ],
        invariant: [ensure('always true', (): true => true)],
      },
      { mode: 'strict' }
    );

    // Should not throw when conditions pass
    const state = expectOk(contract({ value: 1 }, { amount: 2 }));
    expect(state).toEqual({ value: 3 });
  });

  test('guard panic in strict mode wraps as TransitionPanic', () => {
    const contract = define<State, Input, Err>(
      'test.guardPanic',
      {
        pre: [
          guard('broken', () => {
            throw new Error('guard exploded');
          }),
        ],
        transition: (state) => state,
      },
      { mode: 'strict' }
    );

    expect(() => contract({ value: 0 }, { amount: 1 })).toThrow(
      TransitionPanic
    );
  });
});
