import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  createProgramFromFiles,
  isExcluded,
  resolveGlobs,
} from '../src/doc/parser/source-resolver';

const fixturesDir = resolve(__dirname, 'fixtures');

describe('resolveGlobs', () => {
  test('resolves exact file path', () => {
    const files = resolveGlobs(
      ['tests/fixtures/cart-contracts.ts'],
      resolve(__dirname, '..')
    );
    expect(files).toHaveLength(1);
    expect(files[0]).toContain('cart-contracts.ts');
  });

  test('resolves glob pattern with wildcard', () => {
    const files = resolveGlobs(
      ['tests/fixtures/*.ts'],
      resolve(__dirname, '..')
    );
    expect(files.length).toBeGreaterThanOrEqual(2);
    expect(files.some((f) => f.includes('cart-contracts.ts'))).toBe(true);
    expect(files.some((f) => f.includes('cart-tests.ts'))).toBe(true);
  });

  test('resolves ** recursive glob pattern', () => {
    const files = resolveGlobs(['tests/**/*.ts'], resolve(__dirname, '..'));
    expect(files.length).toBeGreaterThan(5);
    expect(files.some((f) => f.includes('fixtures/'))).toBe(true);
  });

  test('deduplicates results', () => {
    const files = resolveGlobs(
      ['tests/fixtures/cart-contracts.ts', 'tests/fixtures/cart-contracts.ts'],
      resolve(__dirname, '..')
    );
    expect(files).toHaveLength(1);
  });

  test('returns empty for non-matching glob', () => {
    const files = resolveGlobs(
      ['tests/fixtures/*.xyz'],
      resolve(__dirname, '..')
    );
    expect(files).toHaveLength(0);
  });
});

describe('createProgramFromFiles', () => {
  test('creates a TypeScript program from files', () => {
    const contractPath = resolve(fixturesDir, 'cart-contracts.ts');
    const program = createProgramFromFiles([contractPath]);

    const sourceFile = program.getSourceFile(contractPath);
    expect(sourceFile).toBeDefined();
    expect(sourceFile?.fileName).toContain('cart-contracts.ts');
  });

  test('creates program with multiple files', () => {
    const contractPath = resolve(fixturesDir, 'cart-contracts.ts');
    const testPath = resolve(fixturesDir, 'cart-tests.ts');
    const program = createProgramFromFiles([contractPath, testPath]);

    expect(program.getSourceFile(contractPath)).toBeDefined();
    expect(program.getSourceFile(testPath)).toBeDefined();
  });

  test('creates program with tsconfig path', () => {
    const contractPath = resolve(fixturesDir, 'cart-contracts.ts');
    const tsconfigPath = resolve(__dirname, '..', 'tsconfig.json');
    const program = createProgramFromFiles([contractPath], tsconfigPath);
    expect(program.getSourceFile(contractPath)).toBeDefined();
  });
});

describe('isExcluded', () => {
  const basePath = '/project';

  test('returns false when exclude patterns is empty', () => {
    expect(isExcluded('/project/src/index.ts', [], basePath)).toBe(false);
  });

  test('matches ** recursive wildcard', () => {
    expect(
      isExcluded(
        '/project/tests/fixtures/cart-contracts.ts',
        ['tests/fixtures/**'],
        basePath
      )
    ).toBe(true);
  });

  test('matches * file wildcard', () => {
    expect(
      isExcluded(
        '/project/tests/fixtures/cart-contracts.ts',
        ['tests/fixtures/*.ts'],
        basePath
      )
    ).toBe(true);
  });

  test('does not match unrelated paths', () => {
    expect(
      isExcluded(
        '/project/src/domain/pipeline.ts',
        ['tests/fixtures/**'],
        basePath
      )
    ).toBe(false);
  });

  test('matches exact relative path', () => {
    expect(
      isExcluded(
        '/project/tests/fixtures/cart-contracts.ts',
        ['tests/fixtures/cart-contracts.ts'],
        basePath
      )
    ).toBe(true);
  });

  test('does not match partial directory name', () => {
    expect(
      isExcluded(
        '/project/tests/fixtures-extra/file.ts',
        ['tests/fixtures/**'],
        basePath
      )
    ).toBe(false);
  });
});

describe('resolveGlobs edge cases', () => {
  test('resolves multi-level directory path without glob', () => {
    const files = resolveGlobs(
      ['tests/fixtures/cart-contracts.ts'],
      resolve(__dirname, '..')
    );
    expect(files).toHaveLength(1);
  });

  test('resolves glob with intermediate wildcard directory', () => {
    const files = resolveGlobs(
      ['tests/*/cart-contracts.ts'],
      resolve(__dirname, '..')
    );
    expect(files).toHaveLength(1);
    expect(files[0]).toContain('cart-contracts.ts');
  });

  test('handles non-existent base directory gracefully', () => {
    const files = resolveGlobs(
      ['nonexistent-dir/*.ts'],
      resolve(__dirname, '..')
    );
    expect(files).toHaveLength(0);
  });
});
