import { resolve } from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { generate } from '../src/doc/index';

// Set cwd to the kata-cli package root so fixtures are resolvable
const kataCliRoot = resolve(__dirname, '..');

describe('generate', () => {
  test('generates markdown for contract files', () => {
    vi.spyOn(process, 'cwd').mockReturnValue(kataCliRoot);

    const markdown = generate({
      title: 'Test Docs',
      contracts: ['tests/fixtures/cart-contracts.ts'],
      locale: 'en',
    });

    expect(markdown).toContain('# Test Docs');
    expect(markdown).toContain('cart.create');
    expect(markdown).toContain('cart.addItem');
    expect(markdown).toContain('cart.removeItem');

    vi.restoreAllMocks();
  });

  test('generates with test linking', () => {
    vi.spyOn(process, 'cwd').mockReturnValue(kataCliRoot);

    const markdown = generate({
      title: 'With Tests',
      contracts: ['tests/fixtures/cart-contracts.ts'],
      tests: ['tests/fixtures/cart-tests.ts'],
      locale: 'ja',
    });

    expect(markdown).toContain('### テストケース');
    expect(markdown).toContain('adds item to existing cart');

    vi.restoreAllMocks();
  });

  test('generates with coverage enabled', () => {
    vi.spyOn(process, 'cwd').mockReturnValue(kataCliRoot);

    const markdown = generate({
      title: 'With Coverage',
      contracts: ['tests/fixtures/cart-contracts.ts'],
      tests: ['tests/fixtures/cart-tests.ts'],
      coverage: true,
      locale: 'en',
    });

    expect(markdown).toContain('## Test Coverage');

    vi.restoreAllMocks();
  });

  test('generates empty document when no files found', () => {
    vi.spyOn(process, 'cwd').mockReturnValue(kataCliRoot);

    const markdown = generate({
      title: 'Empty',
      contracts: ['nonexistent/**/*.ts'],
    });

    expect(markdown).toContain('# Empty');

    vi.restoreAllMocks();
  });

  test('filters by contract IDs', () => {
    vi.spyOn(process, 'cwd').mockReturnValue(kataCliRoot);

    const markdown = generate(
      {
        title: 'Filtered',
        contracts: ['tests/fixtures/cart-contracts.ts'],
        locale: 'en',
      },
      { filterIds: ['cart.create'] }
    );

    expect(markdown).toContain('cart.create');
    expect(markdown).not.toContain('cart.addItem');
    expect(markdown).not.toContain('cart.removeItem');

    vi.restoreAllMocks();
  });

  test('generates with scenario files', () => {
    vi.spyOn(process, 'cwd').mockReturnValue(kataCliRoot);

    const markdown = generate({
      title: 'With Scenarios',
      contracts: ['tests/fixtures/cart-contracts.ts'],
      scenarios: ['tests/fixtures/cart-scenarios.ts'],
      locale: 'ja',
    });

    expect(markdown).toContain('## シナリオ');
    expect(markdown).toContain('cart.normalPurchase');
    expect(markdown).toContain('cart.duplicateCreate');
    expect(markdown).toContain('## Contract詳細');

    vi.restoreAllMocks();
  });
});
