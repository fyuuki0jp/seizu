import ts from 'typescript';
import { buildFlowArtifact, type EntryPoint, FlowGraphBuilder } from './graph';
import type { FlowArtifact } from './types';
import { shortText } from './utils';

interface ParseResult {
  readonly continueEntries: readonly EntryPoint[];
  readonly returnEntries: readonly EntryPoint[];
}

export function extractScenarioFlow(
  flowFn: ts.ArrowFunction,
  sourceFile: ts.SourceFile,
  ownerName: string,
  contractVarMap: ReadonlyMap<string, string>
): FlowArtifact {
  const builder = new FlowGraphBuilder();
  const start = builder.addNode('start', 'start');
  const end = builder.addNode('end', 'end');

  const entries: EntryPoint[] = [{ nodeId: start }];
  const result = ts.isArrayLiteralExpression(flowFn.body)
    ? parseStepArray(flowFn.body, entries, sourceFile, builder, contractVarMap)
    : ts.isBlock(flowFn.body)
      ? parseBlock(
          flowFn.body.statements,
          entries,
          sourceFile,
          builder,
          contractVarMap
        )
      : parseUnsupportedBody(entries, builder);

  const exits = [...result.continueEntries, ...result.returnEntries];
  if (exits.length === 0) {
    builder.addEdge(start, end);
  } else {
    builder.connectEntries(exits, end);
  }

  return buildFlowArtifact('scenario', ownerName, builder.build());
}

function parseUnsupportedBody(
  entries: readonly EntryPoint[],
  builder: FlowGraphBuilder
): ParseResult {
  const unsupported = builder.addNode('unsupported', 'unsupported: flow body');
  builder.connectEntries(entries, unsupported);
  return {
    continueEntries: [{ nodeId: unsupported }],
    returnEntries: [],
  };
}

function parseBlock(
  statements: readonly ts.Statement[],
  entries: readonly EntryPoint[],
  sourceFile: ts.SourceFile,
  builder: FlowGraphBuilder,
  contractVarMap: ReadonlyMap<string, string>
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
      builder,
      contractVarMap
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
  builder: FlowGraphBuilder,
  contractVarMap: ReadonlyMap<string, string>
): ParseResult {
  if (ts.isBlock(statement)) {
    return parseBlock(
      statement.statements,
      entries,
      sourceFile,
      builder,
      contractVarMap
    );
  }

  if (ts.isIfStatement(statement)) {
    return parseIf(statement, entries, sourceFile, builder, contractVarMap);
  }

  if (
    ts.isForStatement(statement) ||
    ts.isForInStatement(statement) ||
    ts.isForOfStatement(statement) ||
    ts.isWhileStatement(statement) ||
    ts.isDoStatement(statement)
  ) {
    return parseLoop(statement, entries, sourceFile, builder, contractVarMap);
  }

  if (ts.isExpressionStatement(statement)) {
    return parseExpressionStatement(
      statement.expression,
      entries,
      sourceFile,
      builder,
      contractVarMap
    );
  }

  if (ts.isVariableStatement(statement) || ts.isEmptyStatement(statement)) {
    return {
      continueEntries: entries,
      returnEntries: [],
    };
  }

  if (ts.isReturnStatement(statement)) {
    if (statement.expression) {
      const fromReturn = parseExpressionStatement(
        statement.expression,
        entries,
        sourceFile,
        builder,
        contractVarMap
      );
      if (
        fromReturn.continueEntries.length > 0 ||
        fromReturn.returnEntries.length > 0
      ) {
        const exits = [
          ...fromReturn.continueEntries,
          ...fromReturn.returnEntries,
        ];
        return {
          continueEntries: [],
          returnEntries: exits,
        };
      }
    }

    return {
      continueEntries: [],
      returnEntries: entries,
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
    const unsupported = builder.addNode(
      'unsupported',
      `unsupported: ${ts.SyntaxKind[statement.kind]}`
    );
    builder.connectEntries(entries, unsupported);
    return {
      continueEntries: [{ nodeId: unsupported }],
      returnEntries: [],
    };
  }

  const unknown = builder.addNode(
    'unsupported',
    `unsupported: ${ts.SyntaxKind[statement.kind]}`
  );
  builder.connectEntries(entries, unknown);
  return {
    continueEntries: [{ nodeId: unknown }],
    returnEntries: [],
  };
}

function parseIf(
  statement: ts.IfStatement,
  entries: readonly EntryPoint[],
  sourceFile: ts.SourceFile,
  builder: FlowGraphBuilder,
  contractVarMap: ReadonlyMap<string, string>
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
    builder,
    contractVarMap
  );

  const elseResult = statement.elseStatement
    ? parseStatement(
        statement.elseStatement,
        [{ nodeId: decision, edgeLabel: 'false' }],
        sourceFile,
        builder,
        contractVarMap
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
  builder: FlowGraphBuilder,
  contractVarMap: ReadonlyMap<string, string>
): ParseResult {
  const loop = builder.addNode('loop', loopLabel(statement, sourceFile));
  builder.connectEntries(entries, loop);

  const bodyResult = parseStatement(
    statement.statement,
    [{ nodeId: loop, edgeLabel: 'iterate' }],
    sourceFile,
    builder,
    contractVarMap
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

function parseExpressionStatement(
  expression: ts.Expression,
  entries: readonly EntryPoint[],
  sourceFile: ts.SourceFile,
  builder: FlowGraphBuilder,
  contractVarMap: ReadonlyMap<string, string>
): ParseResult {
  if (ts.isArrayLiteralExpression(expression)) {
    return parseStepArray(
      expression,
      entries,
      sourceFile,
      builder,
      contractVarMap
    );
  }

  const labels = extractStepLabels(expression, sourceFile, contractVarMap);
  if (labels.length === 0) {
    return {
      continueEntries: entries,
      returnEntries: [],
    };
  }

  let current = [...entries];
  for (const label of labels) {
    const node = builder.addNode('action', label);
    builder.connectEntries(current, node);
    current = [{ nodeId: node }];
  }

  return {
    continueEntries: current,
    returnEntries: [],
  };
}

function parseStepArray(
  array: ts.ArrayLiteralExpression,
  entries: readonly EntryPoint[],
  sourceFile: ts.SourceFile,
  builder: FlowGraphBuilder,
  contractVarMap: ReadonlyMap<string, string>
): ParseResult {
  let current = [...entries];

  for (const element of array.elements) {
    const labels = extractStepLabels(element, sourceFile, contractVarMap);
    for (const label of labels) {
      const node = builder.addNode('action', label);
      builder.connectEntries(current, node);
      current = [{ nodeId: node }];
    }
  }

  return {
    continueEntries: current,
    returnEntries: [],
  };
}

function extractStepLabels(
  expression: ts.Expression,
  sourceFile: ts.SourceFile,
  contractVarMap: ReadonlyMap<string, string>
): string[] {
  if (ts.isParenthesizedExpression(expression)) {
    return extractStepLabels(expression.expression, sourceFile, contractVarMap);
  }

  if (ts.isCallExpression(expression)) {
    if (
      ts.isIdentifier(expression.expression) &&
      expression.expression.text === 'step'
    ) {
      return [stepLabel(expression, sourceFile, contractVarMap)];
    }

    if (
      ts.isPropertyAccessExpression(expression.expression) &&
      expression.expression.name.text === 'push'
    ) {
      const labels: string[] = [];
      for (const arg of expression.arguments) {
        labels.push(...extractStepLabels(arg, sourceFile, contractVarMap));
      }
      return labels;
    }
  }

  if (ts.isArrayLiteralExpression(expression)) {
    const labels: string[] = [];
    for (const element of expression.elements) {
      labels.push(...extractStepLabels(element, sourceFile, contractVarMap));
    }
    return labels;
  }

  if (ts.isAsExpression(expression)) {
    return extractStepLabels(expression.expression, sourceFile, contractVarMap);
  }

  return [];
}

function stepLabel(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile,
  contractVarMap: ReadonlyMap<string, string>
): string {
  if (call.arguments.length === 0) {
    return 'step <unknown>';
  }

  const contractArg = call.arguments[0];
  const contractName = ts.isIdentifier(contractArg)
    ? (contractVarMap.get(contractArg.text) ?? contractArg.text)
    : contractArg.getText(sourceFile);

  return `step ${contractName}`;
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
