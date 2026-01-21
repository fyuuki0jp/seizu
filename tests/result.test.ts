import { describe, expect, test } from 'vitest';
import { err, flatMap, isErr, isOk, map, ok } from '../src/lib/result';

describe('Result', () => {
  test('ok() creates success result', () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(42);
    }
  });

  test('err() creates failure result', () => {
    const result = err('failed');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('failed');
    }
  });

  test('map transforms success value', () => {
    const result = map(ok(2), (x) => x * 3);
    expect(result).toEqual({ ok: true, value: 6 });
  });

  test('map passes through error', () => {
    const result = map(err('fail'), (x: number) => x * 3);
    expect(result).toEqual({ ok: false, error: 'fail' });
  });

  test('flatMap chains on success', () => {
    const result = flatMap(ok(2), (x) => ok(x * 3));
    expect(result).toEqual({ ok: true, value: 6 });
  });

  test('flatMap short-circuits on error', () => {
    const result = flatMap(err('fail'), (x: number) => ok(x * 3));
    expect(result).toEqual({ ok: false, error: 'fail' });
  });

  test('isOk type guard works', () => {
    const success = ok(1);
    const failure = err('e');
    expect(isOk(success)).toBe(true);
    expect(isOk(failure)).toBe(false);
  });

  test('isErr type guard works', () => {
    const success = ok(1);
    const failure = err('e');
    expect(isErr(success)).toBe(false);
    expect(isErr(failure)).toBe(true);
  });
});
