import ts from 'typescript';

/**
 * Extract TSDoc comment from a node's leading trivia.
 * Works for inline functions within array literals.
 */
export function extractLeadingTSDoc(
  node: ts.Node,
  sourceFile: ts.SourceFile
): string | undefined {
  const fullText = sourceFile.getFullText();
  const leadingComments = ts.getLeadingCommentRanges(
    fullText,
    node.getFullStart()
  );
  if (!leadingComments) return undefined;

  for (const comment of leadingComments) {
    if (comment.kind === ts.SyntaxKind.MultiLineCommentTrivia) {
      const commentText = fullText.slice(comment.pos, comment.end);
      if (commentText.startsWith('/**')) {
        return parseJSDocComment(commentText);
      }
    }
  }
  return undefined;
}

/**
 * Extract TSDoc comment from a VariableStatement that contains
 * a VariableDeclaration with the given name.
 */
export function extractVariableTSDoc(
  identifierName: string,
  sourceFile: ts.SourceFile
): string | undefined {
  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === identifierName) {
          return extractStatementTSDoc(statement, sourceFile);
        }
      }
    }
    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === identifierName
    ) {
      return extractStatementTSDoc(statement, sourceFile);
    }
  }
  return undefined;
}

/**
 * Extract TSDoc from a statement node (VariableStatement, FunctionDeclaration, etc.)
 * using both the JSDoc API and leading trivia as fallback.
 */
function extractStatementTSDoc(
  statement: ts.Node,
  sourceFile: ts.SourceFile
): string | undefined {
  // Try JSDoc API first
  const jsDocs = (statement as { jsDoc?: ts.JSDoc[] }).jsDoc;
  if (jsDocs && jsDocs.length > 0) {
    const doc = jsDocs[0];
    if (doc.comment) {
      return typeof doc.comment === 'string'
        ? doc.comment
        : doc.comment.map((part) => part.getText(sourceFile)).join('');
    }
  }

  // Fallback: manual leading comment extraction
  return extractLeadingTSDoc(statement, sourceFile);
}

/**
 * Parse a raw JSDoc comment string, stripping markers and whitespace.
 */
function parseJSDocComment(raw: string): string {
  return raw
    .replace(/^\/\*\*\s*/, '')
    .replace(/\s*\*\/$/, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, ''))
    .join('\n')
    .trim();
}
