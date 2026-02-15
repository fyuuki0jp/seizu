import { describe, expect, test } from 'vitest';
import {
  err,
  flatMap,
  isErr,
  isOk,
  map,
  mapErr,
  match,
  ok,
  orElse,
  pass,
  tap,
  tryCatch,
  unwrapOr,
} from '../src/result';

describe('ok', () => {
  test('creates a success result', () => {
    const result = ok(42);
    expect(result).toEqual({ ok: true, value: 42 });
  });

  test('works with various types', () => {
    expect(ok('hello')).toEqual({ ok: true, value: 'hello' });
    expect(ok(null)).toEqual({ ok: true, value: null });
    expect(ok({ a: 1 })).toEqual({ ok: true, value: { a: 1 } });
  });
});

describe('err', () => {
  test('creates a failure result', () => {
    const result = err('error');
    expect(result).toEqual({ ok: false, error: 'error' });
  });

  test('works with various error types', () => {
    expect(err({ tag: 'NotFound' })).toEqual({
      ok: false,
      error: { tag: 'NotFound' },
    });
  });
});

describe('pass', () => {
  test('is a success result with undefined value', () => {
    expect(pass).toEqual({ ok: true, value: undefined });
  });

  test('is recognized as ok by isOk', () => {
    expect(isOk(pass)).toBe(true);
  });

  test('is not recognized as err by isErr', () => {
    expect(isErr(pass)).toBe(false);
  });
});

describe('isOk', () => {
  test('returns true for ok result', () => {
    expect(isOk(ok(42))).toBe(true);
  });

  test('returns false for err result', () => {
    expect(isOk(err('error'))).toBe(false);
  });
});

describe('isErr', () => {
  test('returns true for err result', () => {
    expect(isErr(err('error'))).toBe(true);
  });

  test('returns false for ok result', () => {
    expect(isErr(ok(42))).toBe(false);
  });
});

describe('map', () => {
  test('transforms success value', () => {
    const result = map(ok(2), (v) => v * 3);
    expect(result).toEqual({ ok: true, value: 6 });
  });

  test('passes through error unchanged', () => {
    const result = map(err('error'), (v: number) => v * 3);
    expect(result).toEqual({ ok: false, error: 'error' });
  });
});

describe('flatMap', () => {
  test('chains on success', () => {
    const result = flatMap(ok(2), (v) => ok(v * 3));
    expect(result).toEqual({ ok: true, value: 6 });
  });

  test('chains to error on success', () => {
    const result = flatMap(ok(2), () => err('fail'));
    expect(result).toEqual({ ok: false, error: 'fail' });
  });

  test('short-circuits on error', () => {
    const result = flatMap(err('error'), (v: number) => ok(v * 3));
    expect(result).toEqual({ ok: false, error: 'error' });
  });
});

describe('match', () => {
  test('calls ok handler for success result', () => {
    const result = match(ok(42), {
      ok: (v) => `value: ${v}`,
      err: (e) => `error: ${e}`,
    });
    expect(result).toBe('value: 42');
  });

  test('calls err handler for failure result', () => {
    const result = match(err('oops'), {
      ok: (v) => `value: ${v}`,
      err: (e) => `error: ${e}`,
    });
    expect(result).toBe('error: oops');
  });
});

describe('mapErr', () => {
  test('transforms error value', () => {
    const result = mapErr(err('oops'), (e) => `wrapped: ${e}`);
    expect(result).toEqual({ ok: false, error: 'wrapped: oops' });
  });

  test('passes through success unchanged', () => {
    const result = mapErr(ok(42), (e: string) => `wrapped: ${e}`);
    expect(result).toEqual({ ok: true, value: 42 });
  });
});

describe('unwrapOr', () => {
  test('returns value for ok result', () => {
    expect(unwrapOr(ok(42), 0)).toBe(42);
  });

  test('returns default for err result', () => {
    expect(unwrapOr(err('oops'), 0)).toBe(0);
  });
});

describe('tryCatch', () => {
  test('wraps successful function in ok', () => {
    const result = tryCatch(
      () => 42,
      (e) => String(e)
    );
    expect(result).toEqual({ ok: true, value: 42 });
  });

  test('wraps thrown error in err', () => {
    const result = tryCatch(
      () => {
        throw new Error('boom');
      },
      (e) => (e instanceof Error ? e.message : 'unknown')
    );
    expect(result).toEqual({ ok: false, error: 'boom' });
  });
});

describe('orElse', () => {
  test('passes through success unchanged', () => {
    const result = orElse(ok(42), (e: string) => ok(Number.parseInt(e, 10)));
    expect(result).toEqual({ ok: true, value: 42 });
  });

  test('applies fallback on error', () => {
    const result = orElse(err('99'), (e) => ok(Number.parseInt(e, 10)));
    expect(result).toEqual({ ok: true, value: 99 });
  });

  test('can return a new error from fallback', () => {
    const result = orElse(err('oops'), () => err('still broken'));
    expect(result).toEqual({ ok: false, error: 'still broken' });
  });
});

describe('tap', () => {
  test('calls function for ok result and returns original', () => {
    const captured: number[] = [];
    const result = tap(ok(42), (v) => captured.push(v));
    expect(result).toEqual({ ok: true, value: 42 });
    expect(captured).toEqual([42]);
  });

  test('does not call function for err result', () => {
    const captured: number[] = [];
    const result = tap(err('oops'), (v: number) => captured.push(v));
    expect(result).toEqual({ ok: false, error: 'oops' });
    expect(captured).toEqual([]);
  });
});

describe('JSON serialization', () => {
  test('ok result is JSON.stringify-able', () => {
    const result = ok({ name: 'test', count: 42 });
    const json = JSON.stringify(result);
    expect(JSON.parse(json)).toEqual({
      ok: true,
      value: { name: 'test', count: 42 },
    });
  });

  test('err result is JSON.stringify-able', () => {
    const result = err({ tag: 'NotFound', id: '123' });
    const json = JSON.stringify(result);
    expect(JSON.parse(json)).toEqual({
      ok: false,
      error: { tag: 'NotFound', id: '123' },
    });
  });
});
