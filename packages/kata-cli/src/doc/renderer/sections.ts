import type { Messages } from '../i18n/types';
import type {
  LinkedContract,
  ParsedCondition,
  ParsedGuard,
  ParsedInvariant,
  ParsedTestCase,
} from '../types';

export function renderContractHeading(linked: LinkedContract): string {
  const { contract } = linked;
  const lines: string[] = [];

  const firstLine = contract.description?.split('\n')[0]?.trim();
  if (firstLine) {
    lines.push(`## ${contract.id} - ${firstLine}`);
  } else {
    lines.push(`## ${contract.id}`);
  }

  lines.push('');

  if (contract.description) {
    const descriptionLines = contract.description.split('\n');
    const rest = descriptionLines.slice(1).join('\n').trim();
    if (rest) {
      lines.push(rest);
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function renderAccepts(
  accepts: readonly string[],
  messages: Messages
): string {
  if (accepts.length === 0) return '';

  const lines: string[] = [];
  lines.push(`### ${messages.accepts.title}`);
  lines.push('');
  lines.push(`> ${messages.accepts.description}`);
  lines.push('');
  for (const a of accepts) {
    lines.push(`- ${a}`);
  }
  lines.push('');
  return lines.join('\n');
}

export function renderTypeTable(
  linked: LinkedContract,
  messages: Messages
): string {
  const { contract } = linked;
  const lines: string[] = [];

  lines.push(
    `| ${messages.typeTable.headerItem} | ${messages.typeTable.headerType} |`
  );
  lines.push('|------|-----|');
  lines.push(
    `| ${messages.typeTable.state} | \`${contract.typeInfo.stateTypeName}\` |`
  );
  lines.push(
    `| ${messages.typeTable.input} | \`${contract.typeInfo.inputTypeName}\` |`
  );
  lines.push(
    `| ${messages.typeTable.error} | \`${contract.typeInfo.errorTypeName}\` |`
  );
  lines.push('');

  return lines.join('\n');
}

export function renderPreconditions(
  guards: readonly ParsedGuard[],
  messages: Messages
): string {
  const lines: string[] = [];
  lines.push(`### ${messages.preconditions.title}`);
  lines.push('');
  lines.push(`> ${messages.preconditions.description}`);
  lines.push('');

  if (guards.length === 0) {
    lines.push(messages.noDefined);
    lines.push('');
    return lines.join('\n');
  }

  lines.push(
    `| # | ${messages.preconditions.columnCondition} | ${messages.preconditions.columnError} |`
  );
  lines.push('|---|------|--------|');

  for (const guard of guards) {
    const num = guard.index + 1;
    const desc = guard.description ?? messages.noDescription;
    const errorTags =
      guard.errorTags.length > 0
        ? guard.errorTags.map((t) => `\`${t}\``).join(', ')
        : '-';
    lines.push(`| ${num} | ${desc} | ${errorTags} |`);
  }

  lines.push('');
  return lines.join('\n');
}

export function renderPostconditions(
  conditions: readonly ParsedCondition[],
  messages: Messages
): string {
  const lines: string[] = [];
  lines.push(`### ${messages.postconditions.title}`);
  lines.push('');
  lines.push(`> ${messages.postconditions.description}`);
  lines.push('');

  if (conditions.length === 0) {
    lines.push(messages.noDefined);
    lines.push('');
    return lines.join('\n');
  }

  lines.push(`| # | ${messages.postconditions.columnCondition} |`);
  lines.push('|---|------|');

  for (const cond of conditions) {
    const num = cond.index + 1;
    const desc = cond.description ?? messages.noDescription;
    lines.push(`| ${num} | ${desc} |`);
  }

  lines.push('');
  return lines.join('\n');
}

export function renderInvariants(
  invariants: readonly ParsedInvariant[],
  messages: Messages
): string {
  const lines: string[] = [];
  lines.push(`### ${messages.invariants.title}`);
  lines.push('');
  lines.push(`> ${messages.invariants.description}`);
  lines.push('');

  if (invariants.length === 0) {
    lines.push(messages.noDefined);
    lines.push('');
    return lines.join('\n');
  }

  lines.push(`| # | ${messages.invariants.columnCondition} |`);
  lines.push('|---|------|');

  for (const inv of invariants) {
    const num = inv.index + 1;
    const desc = inv.description ?? messages.noDescription;
    lines.push(`| ${num} | ${desc} |`);
  }

  lines.push('');
  return lines.join('\n');
}

export function renderErrorCatalog(
  guards: readonly ParsedGuard[],
  messages: Messages
): string {
  const lines: string[] = [];
  lines.push(`### ${messages.errorCatalog.title}`);
  lines.push('');

  const errorMap = new Map<string, number[]>();
  for (const guard of guards) {
    for (const tag of guard.errorTags) {
      const existing = errorMap.get(tag) ?? [];
      existing.push(guard.index + 1);
      errorMap.set(tag, existing);
    }
  }

  if (errorMap.size === 0) {
    lines.push(messages.errorCatalog.noErrors);
    lines.push('');
    return lines.join('\n');
  }

  lines.push(
    `| ${messages.errorCatalog.columnTag} | ${messages.errorCatalog.columnSource} |`
  );
  lines.push('|-----------|--------|');

  for (const [tag, sources] of errorMap) {
    const sourceText = sources
      .map((n) => messages.errorCatalog.sourceRef(n))
      .join(', ');
    lines.push(`| \`${tag}\` | ${sourceText} |`);
  }

  lines.push('');
  return lines.join('\n');
}

export function renderTestExamples(
  tests: readonly ParsedTestCase[] | undefined,
  messages: Messages
): string {
  const lines: string[] = [];
  lines.push(`### ${messages.testExamples.title}`);
  lines.push('');
  lines.push(`> ${messages.testExamples.description}`);
  lines.push('');

  if (!tests || tests.length === 0) {
    lines.push(messages.testExamples.noTests);
    lines.push('');
    return lines.join('\n');
  }

  lines.push(
    `| # | ${messages.testExamples.columnScenario} | ${messages.testExamples.columnExpected} |`
  );
  lines.push('|---|---------|---------|');

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const num = i + 1;
    const result = formatTestResult(test, messages);
    lines.push(`| ${num} | ${test.name} | ${result} |`);
  }

  lines.push('');
  return lines.join('\n');
}

function formatTestResult(test: ParsedTestCase, messages: Messages): string {
  switch (test.classification) {
    case 'success':
      return messages.testResult.success;
    case 'failure': {
      const match = test.name.match(/returns?\s+(\w+)/i);
      if (match) {
        return messages.testResult.errorTag(match[1]);
      }
      return messages.testResult.errorGeneric;
    }
    case 'unknown':
      return '-';
  }
}
