import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { describe, expect, test } from 'vitest';
import { getMessages } from '../src/doc/i18n/index';
import { linkContractsToTests } from '../src/doc/linker/contract-test-linker';
import { parseContracts } from '../src/doc/parser/contract-parser';
import { parseTestSuites } from '../src/doc/parser/test-parser';
import { renderMarkdown } from '../src/doc/renderer/markdown';

const en = getMessages('en');
const ja = getMessages('ja');

describe('integration', () => {
  const contractPath = resolve(__dirname, 'fixtures/cart-contracts.ts');
  const testPath = resolve(__dirname, 'fixtures/cart-tests.ts');

  function loadFixtures() {
    const contractSource = ts.createSourceFile(
      contractPath,
      readFileSync(contractPath, 'utf-8'),
      ts.ScriptTarget.ES2022,
      true
    );
    const testSource = ts.createSourceFile(
      testPath,
      readFileSync(testPath, 'utf-8'),
      ts.ScriptTarget.ES2022,
      true
    );

    const contracts = parseContracts(contractSource);
    const testSuites = parseTestSuites(testSource);
    const linked = linkContractsToTests(contracts, testSuites);
    return { contracts, testSuites, linked };
  }

  test('generates document from fixture files with Japanese locale', () => {
    const { contracts, testSuites, linked } = loadFixtures();

    const markdown = renderMarkdown(
      {
        title: 'カート管理 仕様書',
        description: 'ショッピングカートドメインのContract仕様',
        contracts: linked,
        sourceFiles: [contractPath, testPath],
      },
      { messages: ja }
    );

    // Document structure
    expect(markdown).toContain('# カート管理 仕様書');
    expect(markdown).toContain('ショッピングカートドメインのContract仕様');

    // cart.create
    expect(markdown).toContain('## cart.create - カートを作成する');
    expect(markdown).toContain('カートがまだ存在していないこと');
    expect(markdown).toContain('`AlreadyExists`');

    // cart.addItem
    expect(markdown).toContain('## cart.addItem - カートにアイテムを追加する');
    expect(markdown).toContain('カートが存在していること');
    expect(markdown).toContain('`CartNotFound`');
    expect(markdown).toContain('同じアイテムが既にカートに存在していないこと');
    expect(markdown).toContain('`DuplicateItem`');
    expect(markdown).toContain('アイテム数が1つ増加する');
    expect(markdown).toContain('すべてのアイテムの数量が正の値である');

    // cart.removeItem (no TSDoc on guards)
    expect(markdown).toContain('## cart.removeItem');
    expect(markdown).toContain('`ItemNotFound`');

    // Test cases linked
    expect(markdown).toContain('adds item to existing cart');
    expect(markdown).toContain('正常に処理される');
    expect(markdown).toContain('returns CartNotFound when cart does not exist');
    expect(markdown).toContain('エラー');

    // Table of contents (Japanese)
    expect(markdown).toContain('## 目次');

    // 3 contracts parsed
    expect(contracts).toHaveLength(3);

    // 4 describe blocks (including "contract metadata")
    expect(testSuites).toHaveLength(4);

    // Deterministic: running again produces the same output
    const secondRun = renderMarkdown(
      {
        title: 'カート管理 仕様書',
        description: 'ショッピングカートドメインのContract仕様',
        contracts: linked,
        sourceFiles: [contractPath, testPath],
      },
      { messages: ja }
    );
    expect(markdown).toBe(secondRun);
  });

  test('generates document from fixture files with English locale', () => {
    const { linked } = loadFixtures();

    const markdown = renderMarkdown(
      {
        title: 'Cart Specification',
        description: 'Shopping cart domain contracts',
        contracts: linked,
        sourceFiles: [contractPath, testPath],
      },
      { messages: en }
    );

    // English section headers
    expect(markdown).toContain('### Preconditions');
    expect(markdown).toContain('### Postconditions');
    expect(markdown).toContain('### Invariants');
    expect(markdown).toContain('### Error Catalog');
    expect(markdown).toContain('### Test Cases');
    expect(markdown).toContain('## Table of Contents');

    // Test result labels
    expect(markdown).toContain('Succeeds');

    // Contract descriptions (from fixtures - these are in Japanese as they come from source)
    expect(markdown).toContain('## cart.addItem - カートにアイテムを追加する');
  });
});
