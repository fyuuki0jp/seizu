/**
 * Result type for Railway Oriented Programming
 * Represents either a success (Ok) or failure (Err)
 */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/** Create a success result */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/** Create a failure result */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/** Transform the success value */
export const map = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> => (result.ok ? ok(fn(result.value)) : result);

/** Chain Result-returning functions */
export const flatMap = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> => (result.ok ? fn(result.value) : result);

/** Type guard for success */
export const isOk = <T, E>(
  result: Result<T, E>
): result is { ok: true; value: T } => result.ok;

/** Type guard for failure */
export const isErr = <T, E>(
  result: Result<T, E>
): result is { ok: false; error: E } => !result.ok;
