import { describe, expect, test, vi } from 'vitest';
import { define } from '../src/define';
import type { Result } from '../src/result';
import { err, pass } from '../src/result';
import { expectErr, expectOk } from '../src/testing';

type State = { value: number };
type Input = { amount: number };
type Err = { tag: string };

describe('define', () => {
  test('returns ok when all guards pass', () => {
    const contract = define<State, Input, Err>({
      id: 'test.add',
      pre: [(_s, i) => (i.amount > 0 ? pass : err({ tag: 'NotPositive' }))],
      transition: (state, input) => ({ value: state.value + input.amount }),
    });

    const state = expectOk(contract({ value: 10 }, { amount: 5 }));
    expect(state).toEqual({ value: 15 });
  });

  test('returns err when first guard fails', () => {
    const contract = define<State, Input, Err>({
      id: 'test.add',
      pre: [
        (_s, i) => (i.amount > 0 ? pass : err({ tag: 'NotPositive' })),
        (_s, i) => (i.amount <= 100 ? pass : err({ tag: 'OverLimit' })),
      ],
      transition: (state, input) => ({ value: state.value + input.amount }),
    });

    const error = expectErr(contract({ value: 10 }, { amount: -1 }));
    expect(error).toEqual({ tag: 'NotPositive' });
  });

  test('returns err from second guard with short-circuit evaluation', () => {
    const firstGuard = vi.fn((): Result<void, Err> => pass);
    const secondGuard = vi.fn((): Result<void, Err> => err({ tag: 'Second' }));
    const thirdGuard = vi.fn((): Result<void, Err> => pass);

    const contract = define<State, Input, Err>({
      id: 'test.shortcircuit',
      pre: [firstGuard, secondGuard, thirdGuard],
      transition: (state) => state,
    });

    const error = expectErr(contract({ value: 0 }, { amount: 0 }));
    expect(error).toEqual({ tag: 'Second' });

    expect(firstGuard).toHaveBeenCalledOnce();
    expect(secondGuard).toHaveBeenCalledOnce();
    expect(thirdGuard).not.toHaveBeenCalled();
  });

  test('returns ok when guard array is empty', () => {
    const contract = define<State, Input, Err>({
      id: 'test.noguards',
      pre: [],
      transition: (state, input) => ({ value: state.value + input.amount }),
    });

    const state = expectOk(contract({ value: 10 }, { amount: 5 }));
    expect(state).toEqual({ value: 15 });
  });

  test('is callable as a function', () => {
    const contract = define<State, Input, Err>({
      id: 'test.callable',
      pre: [],
      transition: (state, input) => ({ value: state.value + input.amount }),
    });

    expect(typeof contract).toBe('function');
    expectOk(contract({ value: 1 }, { amount: 2 }));
  });

  test('exposes contract metadata via property access', () => {
    const pre = [(): Result<void, Err> => pass];
    const post = [() => true];
    const inv = [() => true];

    const contract = define<State, Input, Err>({
      id: 'test.metadata',
      pre,
      transition: (state) => state,
      post,
      invariant: inv,
    });

    expect(contract.id).toBe('test.metadata');
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

    const contract = define<State, Input, Err>({
      id: 'test.no-runtime-eval',
      pre: [],
      transition: (state, input) => ({ value: state.value + input.amount }),
      post: [postCheck],
      invariant: [invariantCheck],
    });

    expectOk(contract({ value: 1 }, { amount: 2 }));
    expect(postCheck).not.toHaveBeenCalled();
    expect(invariantCheck).not.toHaveBeenCalled();
  });

  test('guard error can use state and input', () => {
    const contract = define<State, Input, { tag: string; detail: string }>({
      id: 'test.error-args',
      pre: [
        (state, input) =>
          err({
            tag: 'Failed',
            detail: `state=${state.value},input=${input.amount}`,
          }),
      ],
      transition: (state) => state,
    });

    const error = expectErr(contract({ value: 42 }, { amount: 7 }));
    expect(error.detail).toBe('state=42,input=7');
  });
});
