import { describe, expect, test } from 'vitest';
import { err, ok } from '../src/result';
import { expectErr, expectOk } from '../src/testing';

describe('expectOk', () => {
  test('returns value from ok result', () => {
    const result = ok(42);
    expect(expectOk(result)).toBe(42);
  });

  test('returns complex value from ok result', () => {
    const result = ok({ name: 'alice', items: [1, 2, 3] });
    const value = expectOk(result);
    expect(value.name).toBe('alice');
    expect(value.items).toEqual([1, 2, 3]);
  });

  test('throws on err result', () => {
    const result = err({ tag: 'NotFound' });
    expect(() => expectOk(result)).toThrow('Expected ok, got err');
    expect(() => expectOk(result)).toThrow('NotFound');
  });
});

describe('expectErr', () => {
  test('returns error from err result', () => {
    const result = err({ tag: 'NotFound' });
    expect(expectErr(result)).toEqual({ tag: 'NotFound' });
  });

  test('returns error with additional fields', () => {
    const result = err({ tag: 'DuplicateItem', itemId: 'apple' });
    const error = expectErr(result);
    expect(error.tag).toBe('DuplicateItem');
    expect(error.itemId).toBe('apple');
  });

  test('throws on ok result', () => {
    const result = ok(42);
    expect(() => expectErr(result)).toThrow('Expected err, got ok');
    expect(() => expectErr(result)).toThrow('42');
  });
});
