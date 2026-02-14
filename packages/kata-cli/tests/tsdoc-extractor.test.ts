import ts from 'typescript';
import { describe, expect, test } from 'vitest';
import {
  extractLeadingTSDoc,
  extractVariableTSDoc,
} from '../src/doc/parser/tsdoc-extractor';

function createSourceFile(code: string): ts.SourceFile {
  return ts.createSourceFile('test.ts', code, ts.ScriptTarget.ES2022, true);
}

describe('extractLeadingTSDoc', () => {
  test('extracts TSDoc from inline arrow function in array', () => {
    const source = createSourceFile(`
const x = [
  /** カートが存在していること */
  (s) => s.exists,
];
`);
    const arr = findFirstArrayLiteral(source);
    expect(arr).toBeDefined();
    const element = arr?.elements[0];
    const doc = extractLeadingTSDoc(element, source);
    expect(doc).toBe('カートが存在していること');
  });

  test('extracts multi-line TSDoc', () => {
    const source = createSourceFile(`
const x = [
  /**
   * カートが存在し、
   * ユーザーが認証されていること
   */
  (s) => s.exists,
];
`);
    const arr = findFirstArrayLiteral(source);
    const element = arr?.elements[0];
    const doc = extractLeadingTSDoc(element, source);
    expect(doc).toBe('カートが存在し、\nユーザーが認証されていること');
  });

  test('returns undefined when no TSDoc present', () => {
    const source = createSourceFile(`
const x = [
  (s) => s.exists,
];
`);
    const arr = findFirstArrayLiteral(source);
    const element = arr?.elements[0];
    const doc = extractLeadingTSDoc(element, source);
    expect(doc).toBeUndefined();
  });

  test('ignores non-JSDoc comments', () => {
    const source = createSourceFile(`
const x = [
  // regular comment
  (s) => s.exists,
];
`);
    const arr = findFirstArrayLiteral(source);
    const element = arr?.elements[0];
    const doc = extractLeadingTSDoc(element, source);
    expect(doc).toBeUndefined();
  });
});

describe('extractVariableTSDoc', () => {
  test('extracts TSDoc from variable declaration', () => {
    const source = createSourceFile(`
/** カートにアイテムを追加する */
const addItem = define({});
`);
    const doc = extractVariableTSDoc('addItem', source);
    expect(doc).toBe('カートにアイテムを追加する');
  });

  test('extracts multi-line TSDoc from variable', () => {
    const source = createSourceFile(`
/**
 * カートにアイテムを追加する
 *
 * カートが存在している場合にのみ追加可能。
 */
const addItem = define({});
`);
    const doc = extractVariableTSDoc('addItem', source);
    expect(doc).toBe(
      'カートにアイテムを追加する\n\nカートが存在している場合にのみ追加可能。'
    );
  });

  test('returns undefined for non-existent variable', () => {
    const source = createSourceFile(`const foo = 1;`);
    const doc = extractVariableTSDoc('bar', source);
    expect(doc).toBeUndefined();
  });
});

function findFirstArrayLiteral(
  sourceFile: ts.SourceFile
): ts.ArrayLiteralExpression | undefined {
  let result: ts.ArrayLiteralExpression | undefined;
  function visit(node: ts.Node) {
    if (ts.isArrayLiteralExpression(node) && !result) {
      result = node;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return result;
}
