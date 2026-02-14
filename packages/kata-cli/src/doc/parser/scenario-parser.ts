import ts from 'typescript';
import type { ParsedScenario, ParsedScenarioStep } from '../types';
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

  const steps = extractSteps(arg, sourceFile, contractVarMap);
  const variableName = findEnclosingVariableName(call);
  const description = variableName
    ? extractVariableTSDoc(variableName, sourceFile)
    : undefined;

  const line =
    sourceFile.getLineAndCharacterOfPosition(call.getStart(sourceFile)).line +
    1;

  return {
    id,
    description,
    variableName,
    steps,
    sourceFile: sourceFile.fileName,
    line,
  };
}

function extractSteps(
  obj: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
  contractVarMap: Map<string, string>
): ParsedScenarioStep[] {
  const stepsArray = findArrayProperty(obj, 'steps');
  if (!stepsArray) return [];

  return stepsArray.elements
    .map((element, index) =>
      parseStepCall(element, index, sourceFile, contractVarMap)
    )
    .filter((s): s is ParsedScenarioStep => s !== undefined);
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

  // Third arg (optional): options with expect
  let expect: 'ok' | { error: string } | undefined;
  if (args.length >= 3 && ts.isObjectLiteralExpression(args[2])) {
    expect = extractExpect(args[2]);
  }

  return { index, contractId, inputLiteral, expect };
}

function extractExpect(
  obj: ts.ObjectLiteralExpression
): 'ok' | { error: string } | undefined {
  for (const prop of obj.properties) {
    if (
      ts.isPropertyAssignment(prop) &&
      ts.isIdentifier(prop.name) &&
      prop.name.text === 'expect'
    ) {
      if (
        ts.isStringLiteral(prop.initializer) &&
        prop.initializer.text === 'ok'
      ) {
        return 'ok';
      }
      if (ts.isObjectLiteralExpression(prop.initializer)) {
        const errorTag = extractStringProperty(prop.initializer, 'error');
        if (errorTag) {
          return { error: errorTag };
        }
      }
    }
  }
  return undefined;
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

function extractStringProperty(
  obj: ts.ObjectLiteralExpression,
  name: string
): string | undefined {
  for (const prop of obj.properties) {
    if (
      ts.isPropertyAssignment(prop) &&
      ts.isIdentifier(prop.name) &&
      prop.name.text === name
    ) {
      if (ts.isStringLiteral(prop.initializer)) {
        return prop.initializer.text;
      }
    }
  }
  return undefined;
}

function findArrayProperty(
  obj: ts.ObjectLiteralExpression,
  name: string
): ts.ArrayLiteralExpression | undefined {
  for (const prop of obj.properties) {
    if (
      ts.isPropertyAssignment(prop) &&
      ts.isIdentifier(prop.name) &&
      prop.name.text === name
    ) {
      if (ts.isArrayLiteralExpression(prop.initializer)) {
        return prop.initializer;
      }
    }
  }
  return undefined;
}

function findEnclosingVariableName(node: ts.Node): string | undefined {
  let current = node.parent;
  while (current) {
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) {
      return current.name.text;
    }
    current = current.parent;
  }
  return undefined;
}
