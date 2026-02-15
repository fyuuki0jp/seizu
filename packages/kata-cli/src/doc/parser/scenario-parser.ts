import ts from 'typescript';
import { extractScenarioFlow } from '../flow';
import type { ParsedScenario, ParsedScenarioStep } from '../types';
import {
  extractStringArrayProperty,
  extractStringProperty,
  findArrowFunctionProperty,
  findEnclosingVariableName,
} from './ast-utils';
import { extractVariableTSDoc } from './tsdoc-extractor';

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
  if (call.arguments.length === 0) return undefined;

  const arg = call.arguments[0];
  if (!ts.isObjectLiteralExpression(arg)) return undefined;

  const id = extractStringProperty(arg, 'id');
  if (!id) return undefined;

  const accepts = extractStringArrayProperty(arg, 'accepts');
  const steps = extractStepsFromFlow(arg, sourceFile, contractVarMap);
  const flow = extractScenarioFlow(arg, sourceFile, id, contractVarMap);
  const variableName = findEnclosingVariableName(call);
  const tsdocDescription = variableName
    ? extractVariableTSDoc(variableName, sourceFile)
    : undefined;
  const description =
    tsdocDescription ?? extractStringProperty(arg, 'description');

  const line =
    sourceFile.getLineAndCharacterOfPosition(call.getStart(sourceFile)).line +
    1;

  return {
    id,
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
 * Extract steps from the `flow:` arrow function property.
 * Supports both concise body `(input) => [step(...)]` and block body `(input) => { return [...]; }`.
 */
function extractStepsFromFlow(
  obj: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
  contractVarMap: Map<string, string>
): ParsedScenarioStep[] {
  const flowFn = findArrowFunctionProperty(obj, 'flow');
  if (!flowFn) return [];

  const arrayExpr = findArrayInArrowBody(flowFn.body);
  if (arrayExpr) {
    return arrayExpr.elements
      .map((element, index) =>
        parseStepCall(element, index, sourceFile, contractVarMap)
      )
      .filter((s): s is ParsedScenarioStep => s !== undefined);
  }

  // Fallback: handle imperative push pattern
  // e.g. const steps = []; steps.push(step(...)); return steps;
  if (ts.isBlock(flowFn.body)) {
    return collectPushSteps(flowFn.body, sourceFile, contractVarMap);
  }

  return [];
}

/**
 * Collect step() calls from imperative push pattern:
 * const steps = []; steps.push(step(...)); return steps;
 * Recursively walks if/else blocks to find nested pushes.
 */
function collectPushSteps(
  block: ts.Block,
  sourceFile: ts.SourceFile,
  contractVarMap: Map<string, string>
): ParsedScenarioStep[] {
  const arrayVarName = findEmptyArrayVariable(block);
  if (!arrayVarName) return [];

  // Recursively collect all <varName>.push(step(...)) calls
  const stepNodes: ts.Node[] = [];
  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === arrayVarName &&
      node.expression.name.text === 'push' &&
      node.arguments.length === 1
    ) {
      stepNodes.push(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  }
  visit(block);

  return stepNodes
    .map((node, index) =>
      parseStepCall(node, index, sourceFile, contractVarMap)
    )
    .filter((s): s is ParsedScenarioStep => s !== undefined);
}

/**
 * Find the first variable in a block that is initialized as an empty array literal.
 */
function findEmptyArrayVariable(block: ts.Block): string | undefined {
  for (const stmt of block.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (
        ts.isIdentifier(decl.name) &&
        decl.initializer &&
        ts.isArrayLiteralExpression(decl.initializer) &&
        decl.initializer.elements.length === 0
      ) {
        return decl.name.text;
      }
    }
  }
  return undefined;
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
    for (const stmt of body.statements) {
      if (
        ts.isReturnStatement(stmt) &&
        stmt.expression &&
        ts.isArrayLiteralExpression(stmt.expression)
      ) {
        return stmt.expression;
      }
    }
  }

  return undefined;
}

function parseStepCall(
  node: ts.Node,
  index: number,
  sourceFile: ts.SourceFile,
  contractVarMap: Map<string, string>
): ParsedScenarioStep | undefined {
  if (!ts.isCallExpression(node)) return undefined;
  if (!ts.isIdentifier(node.expression) || node.expression.text !== 'step') {
    return undefined;
  }

  const args = node.arguments;
  if (args.length < 2) return undefined;

  // First arg: contract reference
  const contractArg = args[0];
  let contractId: string;
  if (ts.isIdentifier(contractArg)) {
    contractId = contractVarMap.get(contractArg.text) ?? contractArg.text;
  } else {
    contractId = contractArg.getText(sourceFile);
  }

  // Second arg: input literal
  const inputLiteral = args[1].getText(sourceFile);

  return { index, contractId, inputLiteral };
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
      if (callArgs.length > 0 && ts.isObjectLiteralExpression(callArgs[0])) {
        const id = extractStringProperty(callArgs[0], 'id');
        if (id) {
          map.set(node.name.text, id);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return map;
}
