import type { CheckResult, ContractResult, VerifyResult } from 'kata/verify';

function formatValue(value: unknown): string {
  if (value instanceof Map) {
    const entries = [...value.entries()];
    if (entries.length === 0) return 'new Map()';
    return `new Map(${JSON.stringify(entries)})`;
  }
  return JSON.stringify(value, null, 2);
}

function violationLabel(violation: CheckResult['violation']): string {
  switch (violation) {
    case 'pre_not_guarded':
      return 'PRE NOT GUARDED';
    case 'postcondition_failed':
      return 'POSTCONDITION VIOLATION';
    case 'invariant_failed':
      return 'INVARIANT VIOLATION';
    case 'unexpected_error':
      return 'UNEXPECTED ERROR';
    default:
      return 'VIOLATION';
  }
}

function formatFailure(contractId: string, check: CheckResult): string {
  const lines: string[] = [];
  const label = violationLabel(check.violation);

  lines.push(`\u26A0 ${label}: ${contractId} > ${check.id}`);
  lines.push('');

  if (check.counterexample) {
    const stateStr = formatValue(check.counterexample.state);
    const inputStr = formatValue(check.counterexample.input);

    lines.push(`  const state = ${stateStr};`);
    lines.push(`  const input = ${inputStr};`);
    lines.push('');
    lines.push(`  const result = contract(state, input);`);
    lines.push('');
  }

  if (check.seed !== undefined && check.path !== undefined) {
    lines.push(
      `  Reproduce: npx kata verify --seed ${check.seed} --path "${check.path}"`
    );
  }

  return lines.join('\n');
}

function formatContractFailures(result: ContractResult): string[] {
  return result.checks
    .filter((c) => c.status === 'failed')
    .map((check) => formatFailure(result.contractId, check));
}

export function replay(result: VerifyResult): string {
  if (result.success) {
    return 'All checks passed. No failures to replay.';
  }

  const sections = result.results.flatMap(formatContractFailures);
  return sections.join('\n\n---\n\n');
}
