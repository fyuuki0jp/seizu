import type { ParsedContract } from './types';

export interface Diagnostic {
  readonly level: 'error' | 'warning';
  readonly contractId: string;
  readonly message: string;
}

export function validateContracts(
  contracts: readonly ParsedContract[]
): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const c of contracts) {
    if (c.accepts.length === 0) {
      diagnostics.push({
        level: 'error',
        contractId: c.id,
        message: 'Missing @accepts tag in TSDoc comment',
      });
    }
  }
  return diagnostics;
}
