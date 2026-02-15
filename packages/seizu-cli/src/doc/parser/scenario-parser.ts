import ts from 'typescript';
import { extractScenarioFlow } from '../flow';
import type { ParsedScenario, ParsedScenarioStep } from '../types';
import {
  extractStringProperty,
  findArrowFunctionProperty,
  findEnclosingVariableName,
} from './ast-utils';
import { extractAcceptsTags, extractVariableTSDoc } from './tsdoc-extractor';

export interface ScenarioFlowViolation {
  readonly scenarioName: string;
  readonly sourceFile: string;
  readonly line: number;
}

/**
 * Parse all `scenario()` calls in a source file and extract scenario metadata.
 */
export function parseScenarios(sourceFile: ts.SourceFile): ParsedScenario[] {
  const scenarios: ParsedScenario[] = [];
  const contractVarMap = buildContractVarMap(sourceFile);

  function visit(node: ts.Node) {
    if (isScenarioCall(node)) {
      const scenario = parseScenarioCall(node, sourceFile, contractVarMap);
      if (scenario) {
        scenarios.push(scenario);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return scenarios;
}

/**
 * Collect scenario flow violations that are not deterministic.
 * Allowed forms are only:
 * - concise array body: `(input) => [step(...)]`
 * - block body with direct return array: `(input) => { return [step(...)]; }`
 * - every array element must be a direct `step(...)` call
 */
export function collectScenarioFlowViolations(
  sourceFile: ts.SourceFile
): ScenarioFlowViolation[] {
  const violations: ScenarioFlowViolation[] = [];

  function visit(node: ts.Node) {
    if (isScenarioCall(node)) {
      const violation = detectScenarioFlowViolation(node, sourceFile);
      if (violation) {
        violations.push(violation);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

function isScenarioCall(node: ts.Node): node is ts.CallExpression {
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'scenario'
  );
}

function parseScenarioCall(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
  contractVarMap: Map<string, string>
): ParsedScenario | undefined {
  if (call.arguments.length < 2) return undefined;

  const nameArg = call.arguments[0];
  if (!ts.isStringLiteral(nameArg)) return undefined;
  const name = nameArg.text;

  const bodyArg = call.arguments[1];

  // New API: scenario(name, (input) => [...])
  // Legacy API: scenario(name, { flow: (input) => [...] })
  const flowFn = findFlowArrow(bodyArg);

  if (!flowFn && !ts.isObjectLiteralExpression(bodyArg)) return undefined;

  const isDeterministicFlow = flowFn
    ? isDeterministicFlowBody(flowFn.body)
    : false;
  const steps =
    flowFn && isDeterministicFlow
      ? extractStepsFromArrow(flowFn, sourceFile, contractVarMap)
      : [];
  const flow = flowFn
    ? extractScenarioFlow(flowFn, sourceFile, name, contractVarMap)
    : undefined;
  const variableName = findEnclosingVariableName(call);
  const accepts = extractAcceptsTags(call, sourceFile);
  const tsdocDescription = variableName
    ? extractVariableTSDoc(variableName, sourceFile)
    : undefined;
  const description =
    tsdocDescription ??
    (ts.isObjectLiteralExpression(bodyArg)
      ? extractStringProperty(bodyArg, 'description')
      : undefined);

  const line =
    sourceFile.getLineAndCharacterOfPosition(call.getStart(sourceFile)).line +
    1;

  return {
    name,
    accepts,
    description,
    variableName,
    steps,
    flow,
    sourceFile: sourceFile.fileName,
    line,
  };
}

/**
 * Extract steps from a flow arrow function.
 * Supports both concise body `(input) => [step(...)]` and block body `(input) => { return [...]; }`.
 */
function extractStepsFromArrow(
  flowFn: ts.ArrowFunction,
  sourceFile: ts.SourceFile,
  contractVarMap: Map<string, string>
): ParsedScenarioStep[] {
  const arrayExpr = findArrayInArrowBody(flowFn.body);
  if (arrayExpr) {
    return arrayExpr.elements
      .map((element, index) =>
        parseStepCall(element, index, sourceFile, contractVarMap)
      )
      .filter((s): s is ParsedScenarioStep => s !== undefined);
  }

  return [];
}

function findArrayInArrowBody(
  body: ts.ConciseBody
): ts.ArrayLiteralExpression | undefined {
  // Concise body: (input) => [step(...)]
  if (ts.isArrayLiteralExpression(body)) {
    return body;
  }

  // Block body: (input) => { return [...]; }
  if (ts.isBlock(body)) {
    if (body.statements.length !== 1) {
      return undefined;
    }

    const stmt = body.statements[0];
    if (
      ts.isReturnStatement(stmt) &&
      stmt.expression &&
      ts.isArrayLiteralExpression(stmt.expression)
    ) {
      return stmt.expression;
    }
  }

  return undefined;
}

function isDeterministicFlowBody(body: ts.ConciseBody): boolean {
  const arrayExpr = findArrayInArrowBody(body);
  return arrayExpr?.elements.every((element) => isDirectStepCall(element));
}

function findFlowArrow(bodyArg: ts.Expression): ts.ArrowFunction | undefined {
  return ts.isArrowFunction(bodyArg)
    ? bodyArg
    : ts.isObjectLiteralExpression(bodyArg)
      ? findArrowFunctionProperty(bodyArg, 'flow')
      : undefined;
}

function detectScenarioFlowViolation(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile
): ScenarioFlowViolation | undefined {
  if (call.arguments.length < 2) return undefined;
  const nameArg = call.arguments[0];
  if (!ts.isStringLiteral(nameArg)) return undefined;

  const flowFn = findFlowArrow(call.arguments[1]);
  if (!flowFn || isDeterministicFlowBody(flowFn.body)) {
    return undefined;
  }

  const line =
    sourceFile.getLineAndCharacterOfPosition(call.getStart(sourceFile)).line +
    1;
  return {
    scenarioName: nameArg.text,
    sourceFile: sourceFile.fileName,
    line,
  };
}

function parseStepCall(
  node: ts.Node,
  index: number,
  sourceFile: ts.SourceFile,
  contractVarMap: Map<string, string>
): ParsedScenarioStep | undefined {
  if (!isDirectStepCall(node)) {
    return undefined;
  }

  const args = node.arguments;
  if (args.length < 2) return undefined;

  // First arg: contract reference
  const contractArg = args[0];
  let contractName: string;
  if (ts.isIdentifier(contractArg)) {
    contractName = contractVarMap.get(contractArg.text) ?? contractArg.text;
  } else {
    contractName = contractArg.getText(sourceFile);
  }

  // Second arg: input literal
  const inputLiteral = args[1].getText(sourceFile);

  return { index, contractName, inputLiteral };
}

function isDirectStepCall(node: ts.Node): node is ts.CallExpression {
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'step'
  );
}

/**
 * Build a map from variable names to contract IDs for define() calls in the same file.
 */
function buildContractVarMap(sourceFile: ts.SourceFile): Map<string, string> {
  const map = new Map<string, string>();

  function visit(node: ts.Node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression) &&
      node.initializer.expression.text === 'define'
    ) {
      const callArgs = node.initializer.arguments;
      if (callArgs.length > 0 && ts.isStringLiteral(callArgs[0])) {
        map.set(node.name.text, callArgs[0].text);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return map;
}
