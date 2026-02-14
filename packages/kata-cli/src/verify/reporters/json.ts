import type { VerifyResult } from 'kata/verify';

export function json(result: VerifyResult): string {
  return JSON.stringify(result, null, 2);
}
