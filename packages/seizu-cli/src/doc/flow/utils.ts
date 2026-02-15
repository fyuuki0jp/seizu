import ts from 'typescript';

export function shortText(node: ts.Node, sourceFile: ts.SourceFile): string {
  const compact = node.getText(sourceFile).replace(/\s+/g, ' ').trim();
  if (compact.length <= 64) {
    return compact;
  }
  return `${compact.slice(0, 61)}...`;
}

export function isFunctionLikeExpression(
  node: ts.Expression
): node is ts.ArrowFunction | ts.FunctionExpression {
  return ts.isArrowFunction(node) || ts.isFunctionExpression(node);
}

export function findFunctionProperty(
  obj: ts.ObjectLiteralExpression,
  name: string
): ts.ArrowFunction | ts.FunctionExpression | undefined {
  for (const prop of obj.properties) {
    if (
      ts.isPropertyAssignment(prop) &&
      ts.isIdentifier(prop.name) &&
      prop.name.text === name &&
      isFunctionLikeExpression(prop.initializer)
    ) {
      return prop.initializer;
    }
  }
  return undefined;
}

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
