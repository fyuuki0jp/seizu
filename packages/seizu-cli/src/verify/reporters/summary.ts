import type { CheckResult, ContractResult, VerifyResult } from 'seizu/verify';

function safeStringify(value: unknown, spacing?: number): string {
  try {
    const serialized = JSON.stringify(value, null, spacing);
    return serialized ?? String(value);
  } catch {
    return String(value);
  }
}

function formatCheck(check: CheckResult): string {
  const icon = check.status === 'passed' ? '\u2713' : '\u2717';
  const line = `      ${icon} ${check.id.padEnd(24)} ${check.runs} runs`;

  if (check.status === 'failed' && check.counterexample) {
    const ce = check.counterexample;
    const stateStr = formatValue(ce.state);
    const inputStr = formatValue(ce.input);
    const detail = describeViolation(check);
    return [
      line,
      `        Counterexample:`,
      `          state = ${stateStr}`,
      `          input = ${inputStr}`,
      `        ${detail}`,
    ].join('\n');
  }

  return line;
}

function formatValue(value: unknown): string {
  if (value instanceof Map) {
    const entries = [...value.entries()];
    if (entries.length === 0) return 'Map(0) {}';
    return `Map(${entries.length}) { ${entries.map(([k, v]) => `${safeStringify(k)} => ${safeStringify(v)}`).join(', ')} }`;
  }
  return safeStringify(value);
}

function describeViolation(check: CheckResult): string {
  switch (check.violation) {
    case 'pre_not_guarded':
      return `Precondition "${check.id}" is false, but contract returned ok.`;
    case 'postcondition_failed':
      return `All preconditions passed, but postcondition "${check.id}" violated after transition.`;
    case 'invariant_failed':
      return `All preconditions passed, but invariant "${check.id}" violated after transition.`;
    case 'unexpected_error':
      return `All preconditions passed, but contract returned an unexpected error.`;
    default:
      return '';
  }
}

function formatContract(result: ContractResult): string {
  const lines: string[] = [`  ${result.contractName}`];

  const preChecks = result.checks.filter((c) => c.kind === 'pre');
  const postChecks = result.checks.filter((c) => c.kind === 'post');
  const invariantChecks = result.checks.filter((c) => c.kind === 'invariant');
  const consistencyChecks = result.checks.filter(
    (c) => c.kind === 'consistency'
  );

  if (preChecks.length > 0) {
    lines.push('    pre');
    for (const check of preChecks) {
      lines.push(formatCheck(check));
    }
  }

  if (postChecks.length > 0) {
    lines.push('    post');
    for (const check of postChecks) {
      lines.push(formatCheck(check));
    }
  } else if (preChecks.length > 0) {
    lines.push('    post');
    lines.push('      (none)');
  }

  if (invariantChecks.length > 0) {
    lines.push('    invariant');
    for (const check of invariantChecks) {
      lines.push(formatCheck(check));
    }
  }

  for (const check of consistencyChecks) {
    if (check.status === 'failed') {
      lines.push('    consistency');
      lines.push(formatCheck(check));
    }
  }

  return lines.join('\n');
}

export function summary(result: VerifyResult): string {
  const lines: string[] = ['seizu-verify', ''];

  for (const contractResult of result.results) {
    lines.push(formatContract(contractResult));
    lines.push('');
  }

  const { contracts, checks, passed, failed } = result.summary;
  lines.push(
    `  ${contracts} contracts, ${checks} checks, ${passed} passed, ${failed} failed`
  );

  return lines.join('\n');
}
