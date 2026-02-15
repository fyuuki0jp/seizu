import ts from 'typescript';

/**
 * Extract error tags from a function body by scanning for
 * `err({ tag: 'SomeTag' })` or `err({ tag: 'SomeTag' as const })` patterns.
 */
export function extractErrorTags(
  node: ts.Node,
  _sourceFile: ts.SourceFile
): string[] {
  const tags: string[] = [];

  function visit(n: ts.Node) {
    if (
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      n.expression.text === 'err' &&
      n.arguments.length >= 1
    ) {
      const arg = n.arguments[0];
      if (ts.isObjectLiteralExpression(arg)) {
        extractTagFromObjectLiteral(arg, tags);
      }
    }
    // Also handle: { ok: false, error: { tag: '...' } } pattern
    ts.forEachChild(n, visit);
  }

  visit(node);
  return [...new Set(tags)];
}

function extractTagFromObjectLiteral(
  obj: ts.ObjectLiteralExpression,
  tags: string[]
): void {
  for (const prop of obj.properties) {
    if (
      ts.isPropertyAssignment(prop) &&
      ts.isIdentifier(prop.name) &&
      prop.name.text === 'tag'
    ) {
      const value = unwrapAsConst(prop.initializer);
      if (ts.isStringLiteral(value)) {
        tags.push(value.text);
      }
    }
  }
}

/**
 * Unwrap `'value' as const` to get the underlying string literal.
 */
function unwrapAsConst(node: ts.Expression): ts.Expression {
  if (ts.isAsExpression(node)) {
    return node.expression;
  }
  // Handle: <const>'value' (type assertion syntax)
  if (ts.isTypeAssertionExpression(node)) {
    return node.expression;
  }
  return node;
}
