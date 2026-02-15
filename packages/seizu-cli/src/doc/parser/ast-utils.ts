import ts from 'typescript';

/**
 * Extract a string-valued property from an object literal expression.
 */
export function extractStringProperty(
  obj: ts.ObjectLiteralExpression,
  name: string
): string | undefined {
  for (const prop of obj.properties) {
    if (
      ts.isPropertyAssignment(prop) &&
      ts.isIdentifier(prop.name) &&
      prop.name.text === name &&
      ts.isStringLiteral(prop.initializer)
    ) {
      return prop.initializer.text;
    }
  }
  return undefined;
}

/**
 * Find an arrow function property in an object literal expression.
 */
export function findArrowFunctionProperty(
  obj: ts.ObjectLiteralExpression,
  name: string
): ts.ArrowFunction | undefined {
  for (const prop of obj.properties) {
    if (
      ts.isPropertyAssignment(prop) &&
      ts.isIdentifier(prop.name) &&
      prop.name.text === name &&
      ts.isArrowFunction(prop.initializer)
    ) {
      return prop.initializer;
    }
  }
  return undefined;
}

/**
 * Find an array literal property in an object literal expression.
 */
export function findArrayProperty(
  obj: ts.ObjectLiteralExpression,
  name: string
): ts.ArrayLiteralExpression | undefined {
  for (const prop of obj.properties) {
    if (
      ts.isPropertyAssignment(prop) &&
      ts.isIdentifier(prop.name) &&
      prop.name.text === name &&
      ts.isArrayLiteralExpression(prop.initializer)
    ) {
      return prop.initializer;
    }
  }
  return undefined;
}

/**
 * Walk up the AST to find the enclosing variable declaration name.
 */
export function findEnclosingVariableName(node: ts.Node): string | undefined {
  let current = node.parent;
  while (current) {
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) {
      return current.name.text;
    }
    current = current.parent;
  }
  return undefined;
}
