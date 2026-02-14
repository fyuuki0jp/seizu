import ts from 'typescript';
import { describe, expect, test } from 'vitest';
import { extractErrorTags } from '../src/doc/parser/error-tag-extractor';

function createSourceFile(code: string): ts.SourceFile {
  return ts.createSourceFile('test.ts', code, ts.ScriptTarget.ES2022, true);
}

function findFirstArrowFunction(
  sourceFile: ts.SourceFile
): ts.ArrowFunction | undefined {
  let result: ts.ArrowFunction | undefined;
  function visit(node: ts.Node) {
    if (ts.isArrowFunction(node) && !result) {
      result = node;
      return;
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return result;
}

describe('extractErrorTags', () => {
  test('extracts tag from err({ tag: "CartNotFound" })', () => {
    const source = createSourceFile(
      `const guard = (s) => (s.exists ? pass : err({ tag: 'CartNotFound' }));`
    );
    const fn = findFirstArrowFunction(source) as ts.ArrowFunction;
    const tags = extractErrorTags(fn, source);
    expect(tags).toEqual(['CartNotFound']);
  });

  test('extracts tag from err({ tag: "CartNotFound" as const })', () => {
    const source = createSourceFile(
      `const guard = (s) => (s.exists ? pass : err({ tag: 'CartNotFound' as const }));`
    );
    const fn = findFirstArrowFunction(source) as ts.ArrowFunction;
    const tags = extractErrorTags(fn, source);
    expect(tags).toEqual(['CartNotFound']);
  });

  test('extracts multiple tags from a single function', () => {
    const source = createSourceFile(`
const guard = (s, i) => {
  if (!s.exists) return err({ tag: 'CartNotFound' as const });
  if (s.items.has(i.itemId)) return err({ tag: 'DuplicateItem' as const, itemId: i.itemId });
  return pass;
};
`);
    const fn = findFirstArrowFunction(source) as ts.ArrowFunction;
    const tags = extractErrorTags(fn, source);
    expect(tags).toEqual(['CartNotFound', 'DuplicateItem']);
  });

  test('returns empty array when no err() calls', () => {
    const source = createSourceFile(`const fn = (s) => s.exists;`);
    const fn = findFirstArrowFunction(source) as ts.ArrowFunction;
    const tags = extractErrorTags(fn, source);
    expect(tags).toEqual([]);
  });

  test('deduplicates repeated tags', () => {
    const source = createSourceFile(`
const guard = (s) => {
  if (!s.a) return err({ tag: 'NotFound' as const });
  if (!s.b) return err({ tag: 'NotFound' as const });
  return pass;
};
`);
    const fn = findFirstArrowFunction(source) as ts.ArrowFunction;
    const tags = extractErrorTags(fn, source);
    expect(tags).toEqual(['NotFound']);
  });
});
