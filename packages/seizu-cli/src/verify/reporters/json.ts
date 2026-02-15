import type { VerifyResult } from 'seizu/verify';

export function json(result: VerifyResult): string {
  return JSON.stringify(result, null, 2);
}
