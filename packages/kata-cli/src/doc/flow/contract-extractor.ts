import ts from 'typescript';
import { extractErrorTags } from '../parser/error-tag-extractor';
import { buildFlowArtifact, type EntryPoint, FlowGraphBuilder } from './graph';
import type { FlowArtifact } from './types';
import { findArrayProperty, findFunctionProperty, shortText } from './utils';

interface ParseResult {
  readonly continueEntries: readonly EntryPoint[];
  readonly returnEntries: readonly EntryPoint[];
}

export function extractContractFlow(
  obj: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
  ownerId: string
): FlowArtifact {
  const builder = new FlowGraphBuilder();
  const start = builder.addNode('start', 'start');
  const ok = builder.addNode('end', 'ok');

  const preArray = findArrayProperty(obj, 'pre');
  let preSuccessEntries: EntryPoint[] = [{ nodeId: start }];

  for (let i = 0; i < (preArray?.elements.length ?? 0); i++) {
    const element = preArray?.elements[i];
    if (!element) continue;

    const preNode = builder.addNode('precondition', `pre.${i + 1}`);
    builder.connectEntries(preSuccessEntries, preNode);

    const tags = extractGuardErrorTags(element, sourceFile);
    if (tags.length === 0) {
      const errorNode = builder.addNode('error', `error(pre.${i + 1})`);
      builder.addEdge(preNode, errorNode, 'fail');
    } else {
      for (const tag of tags) {
        const errorNode = builder.addNode('error', `error: ${tag}`);
        builder.addEdge(preNode, errorNode, 'fail');
      }
    }

    preSuccessEntries = [{ nodeId: preNode, edgeLabel: 'pass' }];
  }

  const transitionNode = builder.addNode('action', 'transition');
  builder.connectEntries(preSuccessEntries, transitionNode);

  const transitionFn = findFunctionProperty(obj, 'transition');
  const transitionResult = transitionFn
    ? parseTransition(
        transitionFn,
        [{ nodeId: transitionNode }],
        sourceFile,
        builder
      )
    : parseUnsupportedTransition(transitionNode, builder);

  const transitionSuccessEntries =
    transitionResult.continueEntries.length > 0 ||
    transitionResult.returnEntries.length > 0
      ? [...transitionResult.continueEntries, ...transitionResult.returnEntries]
      : [{ nodeId: transitionNode, edgeLabel: 'success' }];

  const postArray = findArrayProperty(obj, 'post');
  const postEntries = chainByCount(
    transitionSuccessEntries,
    postArray?.elements.length ?? 0,
    'postcondition',
    'post',
    builder
  );

  const invariantArray = findArrayProperty(obj, 'invariant');
  const invariantEntries = chainByCount(
    postEntries,
    invariantArray?.elements.length ?? 0,
    'invariant',
    'invariant',
    builder
  );

  builder.connectEntries(invariantEntries, ok);

  return buildFlowArtifact('contract', ownerId, builder.build());
}

function parseUnsupportedTransition(
  transitionNode: string,
  builder: FlowGraphBuilder
): ParseResult {
  const unsupported = builder.addNode(
    'unsupported',
    'unsupported: transition is not function-like'
  );
  builder.addEdge(transitionNode, unsupported);
  return {
    continueEntries: [{ nodeId: unsupported }],
    returnEntries: [],
  };
}

function parseTransition(
  transition: ts.ArrowFunction | ts.FunctionExpression,
  entries: readonly EntryPoint[],
  sourceFile: ts.SourceFile,
  builder: FlowGraphBuilder
): ParseResult {
  if (ts.isBlock(transition.body)) {
    return parseBlock(transition.body.statements, entries, sourceFile, builder);
  }

  const returnNode = builder.addNode(
    'action',
    `return ${shortText(transition.body, sourceFile)}`
  );
  builder.connectEntries(entries, returnNode);
  return {
    continueEntries: [],
    returnEntries: [{ nodeId: returnNode }],
  };
}

function parseBlock(
  statements: readonly ts.Statement[],
  entries: readonly EntryPoint[],
  sourceFile: ts.SourceFile,
  builder: FlowGraphBuilder
): ParseResult {
  let currentEntries: readonly EntryPoint[] = entries;
  const returnEntries: EntryPoint[] = [];

  for (const statement of statements) {
    if (currentEntries.length === 0) {
      break;
    }

    const result = parseStatement(
      statement,
      currentEntries,
      sourceFile,
      builder
    );
    currentEntries = result.continueEntries;
    returnEntries.push(...result.returnEntries);
  }

  return {
    continueEntries: currentEntries,
    returnEntries,
  };
}

function parseStatement(
  statement: ts.Statement,
  entries: readonly EntryPoint[],
  sourceFile: ts.SourceFile,
  builder: FlowGraphBuilder
): ParseResult {
  if (ts.isBlock(statement)) {
    return parseBlock(statement.statements, entries, sourceFile, builder);
  }

  if (ts.isIfStatement(statement)) {
    return parseIf(statement, entries, sourceFile, builder);
  }

  if (
    ts.isForStatement(statement) ||
    ts.isForInStatement(statement) ||
    ts.isForOfStatement(statement) ||
    ts.isWhileStatement(statement) ||
    ts.isDoStatement(statement)
  ) {
    return parseLoop(statement, entries, sourceFile, builder);
  }

  if (ts.isReturnStatement(statement)) {
    const label = statement.expression
      ? `return ${shortText(statement.expression, sourceFile)}`
      : 'return';
    const node = builder.addNode('action', label);
    builder.connectEntries(entries, node);
    return {
      continueEntries: [],
      returnEntries: [{ nodeId: node }],
    };
  }

  if (ts.isThrowStatement(statement)) {
    const label = statement.expression
      ? `throw ${shortText(statement.expression, sourceFile)}`
      : 'throw';
    const node = builder.addNode('error', label);
    builder.connectEntries(entries, node);
    return {
      continueEntries: [],
      returnEntries: [],
    };
  }

  if (
    ts.isSwitchStatement(statement) ||
    ts.isTryStatement(statement) ||
    ts.isBreakStatement(statement) ||
    ts.isContinueStatement(statement)
  ) {
    const node = builder.addNode(
      'unsupported',
      `unsupported: ${ts.SyntaxKind[statement.kind]}`
    );
    builder.connectEntries(entries, node);
    return {
      continueEntries: [{ nodeId: node }],
      returnEntries: [],
    };
  }

  if (ts.isEmptyStatement(statement)) {
    return {
      continueEntries: entries,
      returnEntries: [],
    };
  }

  const actionNode = builder.addNode(
    'action',
    shortText(statement, sourceFile)
  );
  builder.connectEntries(entries, actionNode);
  return {
    continueEntries: [{ nodeId: actionNode }],
    returnEntries: [],
  };
}

function parseIf(
  statement: ts.IfStatement,
  entries: readonly EntryPoint[],
  sourceFile: ts.SourceFile,
  builder: FlowGraphBuilder
): ParseResult {
  const decision = builder.addNode(
    'decision',
    `if ${shortText(statement.expression, sourceFile)}`
  );
  builder.connectEntries(entries, decision);

  const thenResult = parseStatement(
    statement.thenStatement,
    [{ nodeId: decision, edgeLabel: 'true' }],
    sourceFile,
    builder
  );

  const elseResult = statement.elseStatement
    ? parseStatement(
        statement.elseStatement,
        [{ nodeId: decision, edgeLabel: 'false' }],
        sourceFile,
        builder
      )
    : {
        continueEntries: [{ nodeId: decision, edgeLabel: 'false' }],
        returnEntries: [] as EntryPoint[],
      };

  return {
    continueEntries: [
      ...thenResult.continueEntries,
      ...elseResult.continueEntries,
    ],
    returnEntries: [...thenResult.returnEntries, ...elseResult.returnEntries],
  };
}

function parseLoop(
  statement:
    | ts.ForStatement
    | ts.ForInStatement
    | ts.ForOfStatement
    | ts.WhileStatement
    | ts.DoStatement,
  entries: readonly EntryPoint[],
  sourceFile: ts.SourceFile,
  builder: FlowGraphBuilder
): ParseResult {
  const loop = builder.addNode('loop', loopLabel(statement, sourceFile));
  builder.connectEntries(entries, loop);

  const bodyResult = parseStatement(
    statement.statement,
    [{ nodeId: loop, edgeLabel: 'iterate' }],
    sourceFile,
    builder
  );

  for (const continuation of bodyResult.continueEntries) {
    builder.addEdge(
      continuation.nodeId,
      loop,
      continuation.edgeLabel ?? 'next'
    );
  }

  return {
    continueEntries: [{ nodeId: loop, edgeLabel: 'done' }],
    returnEntries: bodyResult.returnEntries,
  };
}

function loopLabel(
  statement:
    | ts.ForStatement
    | ts.ForInStatement
    | ts.ForOfStatement
    | ts.WhileStatement
    | ts.DoStatement,
  sourceFile: ts.SourceFile
): string {
  if (ts.isForStatement(statement)) {
    return 'for (...)';
  }
  if (ts.isForInStatement(statement)) {
    return `for-in ${shortText(statement.expression, sourceFile)}`;
  }
  if (ts.isForOfStatement(statement)) {
    return `for-of ${shortText(statement.expression, sourceFile)}`;
  }
  if (ts.isWhileStatement(statement)) {
    return `while ${shortText(statement.expression, sourceFile)}`;
  }
  return `do-while ${shortText(statement.expression, sourceFile)}`;
}

function chainByCount(
  entries: readonly EntryPoint[],
  count: number,
  kind: 'postcondition' | 'invariant',
  prefix: string,
  builder: FlowGraphBuilder
): EntryPoint[] {
  if (count <= 0) {
    return [...entries];
  }

  let current = [...entries];
  for (let i = 0; i < count; i++) {
    const node = builder.addNode(kind, `${prefix}.${i + 1}`);
    builder.connectEntries(current, node);
    current = [{ nodeId: node }];
  }

  return current;
}

function extractGuardErrorTags(
  element: ts.Expression,
  sourceFile: ts.SourceFile
): string[] {
  if (ts.isIdentifier(element)) {
    return resolveIdentifierErrorTags(element.text, sourceFile);
  }

  if (ts.isArrowFunction(element) || ts.isFunctionExpression(element)) {
    return extractErrorTags(element, sourceFile);
  }

  return [];
}

function resolveIdentifierErrorTags(
  identifierName: string,
  sourceFile: ts.SourceFile
): string[] {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;

    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === identifierName &&
        declaration.initializer
      ) {
        return extractErrorTags(declaration.initializer, sourceFile);
      }
    }
  }

  return [];
}
