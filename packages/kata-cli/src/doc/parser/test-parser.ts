import ts from 'typescript';
import type {
  ParsedTestCase,
  ParsedTestSuite,
  TestClassification,
} from '../types';

/**
 * Parse all `describe()` blocks in a test source file and extract test suites.
 */
export function parseTestSuites(sourceFile: ts.SourceFile): ParsedTestSuite[] {
  const suites: ParsedTestSuite[] = [];

  function visit(node: ts.Node) {
    if (isDescribeCall(node)) {
      const suite = parseDescribeBlock(node, sourceFile);
      if (suite) {
        suites.push(suite);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return suites;
}

function isDescribeCall(node: ts.Node): node is ts.CallExpression {
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'describe' &&
    node.arguments.length >= 2
  );
}

function parseDescribeBlock(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile
): ParsedTestSuite | undefined {
  const labelArg = call.arguments[0];
  if (!ts.isStringLiteral(labelArg)) return undefined;

  const contractId = labelArg.text;
  const callback = call.arguments[1];

  if (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback)) {
    return undefined;
  }

  const tests = extractTestCases(callback.body, sourceFile);

  return {
    contractId,
    tests,
    sourceFile: sourceFile.fileName,
  };
}

function extractTestCases(
  body: ts.Node,
  sourceFile: ts.SourceFile
): ParsedTestCase[] {
  const tests: ParsedTestCase[] = [];

  function visit(node: ts.Node) {
    if (isTestCall(node)) {
      const testCase = parseTestCall(node, sourceFile);
      if (testCase) {
        tests.push(testCase);
      }
    }
    // Don't recurse into nested describe blocks
    if (isDescribeCall(node)) return;
    ts.forEachChild(node, visit);
  }

  visit(body);
  return tests;
}

function isTestCall(node: ts.Node): node is ts.CallExpression {
  if (!ts.isCallExpression(node)) return false;

  // Match: test('...', ...) or it('...', ...)
  if (
    ts.isIdentifier(node.expression) &&
    (node.expression.text === 'test' || node.expression.text === 'it') &&
    node.arguments.length >= 2
  ) {
    return true;
  }

  // Match: test.skip('...', ...) or test.todo('...')
  if (
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    (node.expression.expression.text === 'test' ||
      node.expression.expression.text === 'it')
  ) {
    return true;
  }

  return false;
}

function parseTestCall(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile
): ParsedTestCase | undefined {
  const labelArg = call.arguments[0];
  if (!ts.isStringLiteral(labelArg)) return undefined;

  const name = labelArg.text;
  const line =
    sourceFile.getLineAndCharacterOfPosition(call.getStart(sourceFile)).line +
    1;

  // Check if this is test.skip or test.todo
  if (
    ts.isPropertyAccessExpression(call.expression) &&
    ts.isIdentifier(call.expression.name)
  ) {
    const modifier = call.expression.name.text;
    if (modifier === 'skip' || modifier === 'todo') {
      return {
        name,
        classification: 'unknown',
        sourceFile: sourceFile.fileName,
        line,
      };
    }
  }

  // Classify based on test body
  const testBody = call.arguments[1];
  const classification = testBody ? classifyTest(testBody) : 'unknown';

  return {
    name,
    classification,
    sourceFile: sourceFile.fileName,
    line,
  };
}

function classifyTest(testBody: ts.Node): TestClassification {
  let hasExpectOk = false;
  let hasExpectErr = false;

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      if (name === 'expectOk') hasExpectOk = true;
      if (name === 'expectErr') hasExpectErr = true;
    }

    // Also detect isOk/isErr usage patterns
    if (ts.isIdentifier(node)) {
      if (node.text === 'isOk') hasExpectOk = true;
      if (node.text === 'isErr') hasExpectErr = true;
    }

    ts.forEachChild(node, visit);
  }

  visit(testBody);

  // If both appear, it's ambiguous
  if (hasExpectOk && hasExpectErr) return 'unknown';
  if (hasExpectOk) return 'success';
  if (hasExpectErr) return 'failure';
  return 'unknown';
}
