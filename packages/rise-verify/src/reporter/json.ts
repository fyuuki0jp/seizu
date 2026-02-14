import type { VerifyResult } from '../types';

export function json(result: VerifyResult): string {
  return JSON.stringify(result, null, 2);
}
