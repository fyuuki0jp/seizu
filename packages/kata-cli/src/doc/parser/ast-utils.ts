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
 * Extract a string array property from an object literal expression.
 * Supports `as const` assertions and template literals.
 */
export function extractStringArrayProperty(
  obj: ts.ObjectLiteralExpression,
  name: string
): readonly string[] {
  for (const prop of obj.properties) {
    if (
      !ts.isPropertyAssignment(prop) ||
      !ts.isIdentifier(prop.name) ||
      prop.name.text !== name
    ) {
      continue;
    }

    const init = ts.isAsExpression(prop.initializer)
      ? prop.initializer.expression
      : prop.initializer;

    if (!ts.isArrayLiteralExpression(init)) continue;

    return init.elements.flatMap((el) =>
      ts.isStringLiteral(el) || ts.isNoSubstitutionTemplateLiteral(el)
        ? [el.text]
        : []
    );
  }
  return [];
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
