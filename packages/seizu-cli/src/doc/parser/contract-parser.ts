import ts from 'typescript';
import { extractContractFlow } from '../flow';
import type {
  ParsedCondition,
  ParsedContract,
  ParsedGuard,
  ParsedInvariant,
  ParsedTypeInfo,
} from '../types';
import {
  extractStringProperty,
  findArrayProperty,
  findEnclosingVariableName,
} from './ast-utils';
import { extractErrorTags } from './error-tag-extractor';
import {
  extractAcceptsTags,
  extractLeadingTSDoc,
  extractVariableTSDoc,
} from './tsdoc-extractor';

/**
 * Parse all `define()` calls in a source file and extract contract metadata.
 */
export function parseContracts(sourceFile: ts.SourceFile): ParsedContract[] {
  const contracts: ParsedContract[] = [];

  function visit(node: ts.Node) {
    if (isDefineCall(node)) {
      const contract = parseDefineCall(node, sourceFile);
      if (contract) {
        contracts.push(contract);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return contracts;
}

function isDefineCall(node: ts.Node): node is ts.CallExpression {
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'define'
  );
}

function parseDefineCall(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile
): ParsedContract | undefined {
  if (call.arguments.length < 2) return undefined;

  const nameArg = call.arguments[0];
  if (!ts.isStringLiteral(nameArg)) return undefined;
  const name = nameArg.text;

  const bodyArg = call.arguments[1];
  if (!ts.isObjectLiteralExpression(bodyArg)) return undefined;

  const typeInfo = extractTypeInfo(call, sourceFile);
  const guards = extractGuards(bodyArg, sourceFile);
  const conditions = extractConditions(bodyArg, sourceFile);
  const invariants = extractInvariants(bodyArg, sourceFile);
  const flow = extractContractFlow(bodyArg, sourceFile, name);
  const variableName = findEnclosingVariableName(call);
  const accepts = extractAcceptsTags(call, sourceFile);
  const tsdocDescription = variableName
    ? extractVariableTSDoc(variableName, sourceFile)
    : undefined;
  const description =
    tsdocDescription ?? extractStringProperty(bodyArg, 'description');

  const line =
    sourceFile.getLineAndCharacterOfPosition(call.getStart(sourceFile)).line +
    1;

  return {
    name,
    accepts,
    description,
    typeInfo,
    guards,
    conditions,
    invariants,
    flow,
    variableName,
    sourceFile: sourceFile.fileName,
    line,
  };
}

function extractTypeInfo(
  call: ts.CallExpression,
  sourceFile: ts.SourceFile
): ParsedTypeInfo {
  const typeArgs = call.typeArguments;
  if (!typeArgs || typeArgs.length < 3) {
    return {
      stateTypeName: 'unknown',
      inputTypeName: 'unknown',
      errorTypeName: 'unknown',
    };
  }

  return {
    stateTypeName: typeArgs[0].getText(sourceFile),
    inputTypeName: typeArgs[1].getText(sourceFile),
    errorTypeName: typeArgs[2].getText(sourceFile),
  };
}

function extractGuards(
  obj: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile
): ParsedGuard[] {
  const preArray = findArrayProperty(obj, 'pre');
  if (!preArray) return [];

  return preArray.elements.map((element, index) => {
    // Identifier reference to a guard variable
    if (ts.isIdentifier(element)) {
      const resolved = resolveGuardCall(element.text, sourceFile);
      return {
        index,
        description:
          resolved?.label ?? extractVariableTSDoc(element.text, sourceFile),
        errorTags:
          resolved?.errorTags ??
          resolveIdentifierErrorTags(element.text, sourceFile),
        kind: 'reference' as const,
        referenceName: element.text,
      };
    }

    // guard('label', fn) call expression
    if (
      ts.isCallExpression(element) &&
      ts.isIdentifier(element.expression) &&
      element.expression.text === 'guard'
    ) {
      const label =
        element.arguments.length > 0 && ts.isStringLiteral(element.arguments[0])
          ? element.arguments[0].text
          : undefined;
      const fnArg = element.arguments[1];
      const errorTags =
        fnArg && (ts.isArrowFunction(fnArg) || ts.isFunctionExpression(fnArg))
          ? extractErrorTags(fnArg, sourceFile)
          : [];
      return {
        index,
        description: label,
        errorTags,
        kind: 'inline' as const,
        referenceName: undefined,
      };
    }

    return {
      index,
      description: extractLeadingTSDoc(element, sourceFile),
      errorTags:
        ts.isArrowFunction(element) || ts.isFunctionExpression(element)
          ? extractErrorTags(element, sourceFile)
          : [],
      kind: 'inline' as const,
      referenceName: undefined,
    };
  });
}

function extractConditions(
  obj: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile
): ParsedCondition[] {
  const postArray = findArrayProperty(obj, 'post');
  if (!postArray) return [];

  return postArray.elements.map((element, index) => {
    if (ts.isIdentifier(element)) {
      const resolved = resolveLabeledCall(element.text, 'check', sourceFile);
      return {
        index,
        description: resolved ?? extractVariableTSDoc(element.text, sourceFile),
        kind: 'reference' as const,
        referenceName: element.text,
      };
    }

    // check('label', fn) call expression
    if (
      ts.isCallExpression(element) &&
      ts.isIdentifier(element.expression) &&
      element.expression.text === 'check'
    ) {
      const label =
        element.arguments.length > 0 && ts.isStringLiteral(element.arguments[0])
          ? element.arguments[0].text
          : undefined;
      return {
        index,
        description: label,
        kind: 'inline' as const,
        referenceName: undefined,
      };
    }

    return {
      index,
      description: extractLeadingTSDoc(element, sourceFile),
      kind: 'inline' as const,
      referenceName: undefined,
    };
  });
}

function extractInvariants(
  obj: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile
): ParsedInvariant[] {
  const invArray = findArrayProperty(obj, 'invariant');
  if (!invArray) return [];

  return invArray.elements.map((element, index) => {
    if (ts.isIdentifier(element)) {
      const resolved = resolveLabeledCall(element.text, 'ensure', sourceFile);
      return {
        index,
        description: resolved ?? extractVariableTSDoc(element.text, sourceFile),
        kind: 'reference' as const,
        referenceName: element.text,
      };
    }

    // ensure('label', fn) call expression
    if (
      ts.isCallExpression(element) &&
      ts.isIdentifier(element.expression) &&
      element.expression.text === 'ensure'
    ) {
      const label =
        element.arguments.length > 0 && ts.isStringLiteral(element.arguments[0])
          ? element.arguments[0].text
          : undefined;
      return {
        index,
        description: label,
        kind: 'inline' as const,
        referenceName: undefined,
      };
    }

    return {
      index,
      description: extractLeadingTSDoc(element, sourceFile),
      kind: 'inline' as const,
      referenceName: undefined,
    };
  });
}

function resolveIdentifierErrorTags(
  identifierName: string,
  sourceFile: ts.SourceFile
): string[] {
  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.name.text === identifierName &&
          decl.initializer
        ) {
          return extractErrorTags(decl.initializer, sourceFile);
        }
      }
    }
  }
  return [];
}

/**
 * Resolve identifier reference to a guard('label', fn) call,
 * extracting both label and error tags.
 */
function resolveGuardCall(
  identifierName: string,
  sourceFile: ts.SourceFile
): { label: string; errorTags: string[] } | undefined {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const decl of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(decl.name) &&
        decl.name.text === identifierName &&
        decl.initializer &&
        ts.isCallExpression(decl.initializer) &&
        ts.isIdentifier(decl.initializer.expression) &&
        decl.initializer.expression.text === 'guard'
      ) {
        const args = decl.initializer.arguments;
        const label =
          args.length > 0 && ts.isStringLiteral(args[0])
            ? args[0].text
            : undefined;
        if (!label) return undefined;
        const fnArg = args[1];
        const errorTags =
          fnArg && (ts.isArrowFunction(fnArg) || ts.isFunctionExpression(fnArg))
            ? extractErrorTags(fnArg, sourceFile)
            : [];
        return { label, errorTags };
      }
    }
  }
  return undefined;
}

/**
 * Resolve identifier reference to a check('label', fn) or ensure('label', fn) call,
 * extracting the label string.
 */
function resolveLabeledCall(
  identifierName: string,
  calleeName: string,
  sourceFile: ts.SourceFile
): string | undefined {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const decl of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(decl.name) &&
        decl.name.text === identifierName &&
        decl.initializer &&
        ts.isCallExpression(decl.initializer) &&
        ts.isIdentifier(decl.initializer.expression) &&
        decl.initializer.expression.text === calleeName
      ) {
        const args = decl.initializer.arguments;
        if (args.length > 0 && ts.isStringLiteral(args[0])) {
          return args[0].text;
        }
      }
    }
  }
  return undefined;
}
