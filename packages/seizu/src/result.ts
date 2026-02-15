export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const isOk = <T, E>(
  result: Result<T, E>
): result is { readonly ok: true; readonly value: T } => result.ok;

export const isErr = <T, E>(
  result: Result<T, E>
): result is { readonly ok: false; readonly error: E } => !result.ok;

export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> => (result.ok ? ok(fn(result.value)) : result);

export const flatMap = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> => (result.ok ? fn(result.value) : result);

export const match = <T, E, U>(
  result: Result<T, E>,
  handlers: { ok: (value: T) => U; err: (error: E) => U }
): U => (result.ok ? handlers.ok(result.value) : handlers.err(result.error));

export const pass: Result<void, never> = { ok: true, value: undefined };

export const mapErr = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> => (result.ok ? result : err(fn(result.error)));

export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T =>
  result.ok ? result.value : defaultValue;

export const tryCatch = <T, E>(
  fn: () => T,
  onError: (error: unknown) => E
): Result<T, E> => {
  try {
    return ok(fn());
  } catch (e) {
    return err(onError(e));
  }
};

export const orElse = <T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => Result<T, F>
): Result<T, F> => (result.ok ? result : fn(result.error));

export const tap = <T, E>(
  result: Result<T, E>,
  fn: (value: T) => void
): Result<T, E> => {
  if (result.ok) fn(result.value);
  return result;
};
