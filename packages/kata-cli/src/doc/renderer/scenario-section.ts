import ts from 'typescript';
import type { Messages } from '../i18n/types';
import type { LinkedScenario } from '../types';
import { renderFlowSection } from './flow-section';
import { renderAccepts } from './sections';

export interface ScenarioSectionRenderOptions {
  readonly flowEnabled: boolean;
}

export function renderScenarioSection(
  scenarios: readonly LinkedScenario[],
  messages: Messages,
  options: ScenarioSectionRenderOptions = { flowEnabled: true }
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

    if (scenario.accepts.length > 0) {
      lines.push(renderAccepts(scenario.accepts, messages));
    }

    lines.push(`| ${s.columnStep} | ${s.columnOperation} | ${s.columnInput} |`);
    lines.push('|---|------|------|');

    for (const { step } of linked.resolvedSteps) {
      const num = step.index + 1;
      const operation = `\`${step.contractId}\``;
      const input = formatInput(step.inputLiteral);
      lines.push(`| ${num} | ${operation} | ${input} |`);
    }

    lines.push('');

    if (options.flowEnabled && scenario.flow) {
      lines.push(renderFlowSection(scenario.flow, messages));
    }
  }

  return lines.join('\n');
}

function formatInput(inputLiteral: string): string {
  const raw = inputLiteral.trim();
  const text = stripTypeAssertion(raw);

  // Clean up object literal for table display
  const cleaned = text
    .replace(/^\{/, '')
    .replace(/\}$/, '')
    .replace(/\n\s*/g, ' ')
    .replace(/,\s*$/, '')
    .trim();
  return cleaned || '-';
}

function stripTypeAssertion(input: string): string {
  try {
    const source = ts.createSourceFile(
      'inline.ts',
      `const __x = (${input});`,
      ts.ScriptTarget.ES2022,
      true,
      ts.ScriptKind.TS
    );
    const stmt = source.statements[0];
    if (!stmt || !ts.isVariableStatement(stmt)) {
      return input;
    }
    const decl = stmt.declarationList.declarations[0];
    if (!decl?.initializer) {
      return input;
    }

    let expr: ts.Expression = decl.initializer;
    if (ts.isParenthesizedExpression(expr)) {
      expr = expr.expression;
    }

    while (ts.isAsExpression(expr) || ts.isTypeAssertionExpression(expr)) {
      expr = expr.expression;
    }

    return expr.getText(source);
  } catch {
    return input;
  }
}
