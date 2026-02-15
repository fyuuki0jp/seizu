import type { Result } from './result';

function describeValue(value: unknown): string {
  try {
    const serialized = JSON.stringify(value);
    return serialized ?? String(value);
  } catch {
    return String(value);
  }
}

export function expectOk<T, E>(result: Result<T, E>): T {
  if (!result.ok) {
    throw new Error(`Expected ok, got err: ${describeValue(result.error)}`);
  }
  return result.value;
}

export function expectErr<T, E>(result: Result<T, E>): E {
  if (!result.ok) return result.error;
  throw new Error(`Expected err, got ok: ${describeValue(result.value)}`);
}
