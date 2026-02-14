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
import { extractLeadingTSDoc, extractVariableTSDoc } from './tsdoc-extractor';

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
  if (call.arguments.length === 0) return undefined;

  const arg = call.arguments[0];
  if (!ts.isObjectLiteralExpression(arg)) return undefined;

  const id = extractStringProperty(arg, 'id');
  if (!id) return undefined;

  const typeInfo = extractTypeInfo(call, sourceFile);
  const guards = extractGuards(arg, sourceFile);
  const conditions = extractConditions(arg, sourceFile);
  const invariants = extractInvariants(arg, sourceFile);
  const flow = extractContractFlow(arg, sourceFile, id);
  const variableName = findEnclosingVariableName(call);
  const tsdocDescription = variableName
    ? extractVariableTSDoc(variableName, sourceFile)
    : undefined;
  const description =
    tsdocDescription ?? extractStringProperty(arg, 'description');

  const line =
    sourceFile.getLineAndCharacterOfPosition(call.getStart(sourceFile)).line +
    1;

  return {
    id,
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
    if (ts.isIdentifier(element)) {
      return {
        index,
        description: extractVariableTSDoc(element.text, sourceFile),
        errorTags: resolveIdentifierErrorTags(element.text, sourceFile),
        kind: 'reference' as const,
        referenceName: element.text,
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
      return {
        index,
        description: extractVariableTSDoc(element.text, sourceFile),
        kind: 'reference' as const,
        referenceName: element.text,
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
      return {
        index,
        description: extractVariableTSDoc(element.text, sourceFile),
        kind: 'reference' as const,
        referenceName: element.text,
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
