import type { Messages } from '../i18n/types';
import type { LinkedScenario } from '../types';

export function renderScenarioSection(
  scenarios: readonly LinkedScenario[],
  messages: Messages
): string {
  const lines: string[] = [];
  const s = messages.scenarios;

  lines.push(`## ${s.sectionTitle}`);
  lines.push('');
  lines.push(`> ${s.sectionDescription}`);
  lines.push('');

  if (scenarios.length === 0) {
    lines.push(s.noScenarios);
    lines.push('');
    return lines.join('\n');
  }

  for (const linked of scenarios) {
    const { scenario } = linked;
    const firstLine = scenario.description?.split('\n')[0]?.trim();

    if (firstLine) {
      lines.push(`### ${firstLine}`);
    } else {
      lines.push(`### ${scenario.id}`);
    }
    lines.push('');
    lines.push(`> \`${scenario.id}\``);
    lines.push('');

    lines.push(
      `| ${s.columnStep} | ${s.columnOperation} | ${s.columnInput} | ${s.columnExpected} |`
    );
    lines.push('|---|------|------|---------|');

    for (const { step } of linked.resolvedSteps) {
      const num = step.index + 1;
      const operation = `\`${step.contractId}\``;
      const input = formatInput(step.inputLiteral);
      const expected = formatExpect(step.expect, s);
      lines.push(`| ${num} | ${operation} | ${input} | ${expected} |`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

function formatInput(inputLiteral: string): string {
  // Clean up object literal for table display
  const cleaned = inputLiteral.replace(/^\{/, '').replace(/\}$/, '').trim();
  return cleaned || '-';
}

function formatExpect(
  expect: 'ok' | { error: string } | undefined,
  messages: Messages['scenarios']
): string {
  if (!expect || expect === 'ok') {
    return messages.expectOk;
  }
  return messages.expectError(expect.error);
}
