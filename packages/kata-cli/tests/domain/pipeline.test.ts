import { resolve } from 'node:path';
import { expectErr, expectOk } from 'kata/testing';
import ts from 'typescript';
import { describe, expect, test, vi } from 'vitest';
import { getMessages } from '../../src/doc/i18n/index';
import { generate } from '../../src/doc/index';
import type { DocPipelineState, SourceFileEntry } from '../../src/domain/index';
import {
  docAnalyze,
  docFilter,
  docGenerate,
  docLink,
  docParse,
  docRender,
} from '../../src/domain/index';

const messages = getMessages('en');

const kataCliRoot = resolve(__dirname, '../..');

function createSourceFile(filePath: string, content: string): ts.SourceFile {
  return ts.createSourceFile(filePath, content, ts.ScriptTarget.ES2022, true);
}

function makeInitialState(
  overrides: Partial<DocPipelineState> = {}
): DocPipelineState {
  return {
    title: 'Test Docs',
    description: 'Test description',
    flowEnabled: true,
    messages,
    sourceFiles: [],
    contracts: [],
    scenarios: [],
    testSuites: [],
    filtered: [],
    linked: [],
    linkedScenarios: [],
    coverageReport: undefined,
    markdown: '',
    ...overrides,
  };
}

const contractSource = `
import { define, err, pass } from 'kata';

type State = { readonly exists: boolean };
type AlreadyExists = { readonly tag: 'AlreadyExists' };

/** Create a cart */
export const createCart = define<State, { userId: string }, AlreadyExists>({
  id: 'cart.create',
  pre: [
    (s) => (!s.exists ? pass : err({ tag: 'AlreadyExists' as const })),
  ],
  transition: (state, input) => ({ ...state, exists: true }),
});
`;

const testSource = `
import { expectOk, expectErr } from 'kata/testing';
import { describe, test, expect } from 'vitest';

describe('cart.create', () => {
  test('creates a cart when it does not exist', () => {
    const state = expectOk({} as unknown);
    expect(state).toBeDefined();
  });
  test('returns AlreadyExists when cart exists', () => {
    const error = expectErr({} as unknown);
    expect(error).toBeDefined();
  });
});
`;

function makeSourceFileEntries(): SourceFileEntry[] {
  return [
    {
      path: 'contracts.ts',
      kind: 'contract',
      sourceFile: createSourceFile('contracts.ts', contractSource),
    },
    {
      path: 'contracts.ts',
      kind: 'scenario',
      sourceFile: createSourceFile('contracts.ts', contractSource),
    },
    {
      path: 'tests.ts',
      kind: 'test',
      sourceFile: createSourceFile('tests.ts', testSource),
    },
  ];
}

// === doc.parse ===

describe('doc.parse', () => {
  test('parses contracts from source files', () => {
    const state = makeInitialState();
    const entries = makeSourceFileEntries();

    const result = expectOk(docParse(state, { sourceFiles: entries }));
    expect(result.contracts.length).toBeGreaterThan(0);
    expect(result.contracts[0].id).toBe('cart.create');
  });

  test('parses test suites from source files', () => {
    const state = makeInitialState();
    const entries = makeSourceFileEntries();

    const result = expectOk(docParse(state, { sourceFiles: entries }));
    expect(result.testSuites.length).toBeGreaterThan(0);
    expect(result.testSuites[0].contractId).toBe('cart.create');
  });

  test('rejects empty source files', () => {
    const state = makeInitialState();
    const error = expectErr(docParse(state, { sourceFiles: [] }));
    expect(error.tag).toBe('NoSourceFiles');
  });

  test('preserves title and messages', () => {
    const state = makeInitialState({ title: 'My Title' });
    const entries = makeSourceFileEntries();

    const result = expectOk(docParse(state, { sourceFiles: entries }));
    expect(result.title).toBe('My Title');
    expect(result.messages).toBe(messages);
  });

  test('post/invariant: hold after transition', () => {
    const before = makeInitialState();
    const input = { sourceFiles: makeSourceFileEntries() };
    const after = docParse.transition(before, input);
    for (const post of docParse.post ?? []) {
      expect(post(before, after, input)).toBe(true);
    }
    for (const inv of docParse.invariant ?? []) {
      expect(inv(after)).toBe(true);
    }
  });

  test('exposes contract metadata', () => {
    expect(docParse.id).toBe('doc.parse');
    expect(docParse.pre.length).toBe(1);
  });
});

// === doc.filter ===

describe('doc.filter', () => {
  test('filters contracts by IDs', () => {
    const state = makeInitialState();
    const entries = makeSourceFileEntries();
    const parsed = expectOk(docParse(state, { sourceFiles: entries }));

    const result = expectOk(
      docFilter(parsed, { filterIds: new Set(['cart.create']) })
    );
    expect(result.filtered.length).toBe(1);
    expect(result.filtered[0].id).toBe('cart.create');
  });

  test('passes all contracts when no filter', () => {
    const state = makeInitialState();
    const entries = makeSourceFileEntries();
    const parsed = expectOk(docParse(state, { sourceFiles: entries }));

    const result = expectOk(docFilter(parsed, {}));
    expect(result.filtered.length).toBe(parsed.contracts.length);
  });

  test('returns empty when filter matches nothing', () => {
    const state = makeInitialState();
    const entries = makeSourceFileEntries();
    const parsed = expectOk(docParse(state, { sourceFiles: entries }));

    const result = expectOk(
      docFilter(parsed, { filterIds: new Set(['nonexistent']) })
    );
    expect(result.filtered.length).toBe(0);
  });

  test('post/invariant: hold after transition', () => {
    const state = makeInitialState();
    const entries = makeSourceFileEntries();
    const before = expectOk(docParse(state, { sourceFiles: entries }));
    const input = { filterIds: new Set(['cart.create']) };
    const after = docFilter.transition(before, input);
    for (const post of docFilter.post ?? []) {
      expect(post(before, after, input)).toBe(true);
    }
    for (const inv of docFilter.invariant ?? []) {
      expect(inv(after)).toBe(true);
    }
  });
});

// === doc.link ===

describe('doc.link', () => {
  test('links contracts to tests', () => {
    const state = makeInitialState();
    const entries = makeSourceFileEntries();
    const parsed = expectOk(docParse(state, { sourceFiles: entries }));
    const filtered = expectOk(docFilter(parsed, {}));

    const result = expectOk(docLink(filtered, {} as Record<string, never>));
    expect(result.linked.length).toBe(result.filtered.length);
    expect(result.linked[0].testSuite).toBeDefined();
  });

  test('post/invariant: hold after transition', () => {
    const state = makeInitialState();
    const entries = makeSourceFileEntries();
    const parsed = expectOk(docParse(state, { sourceFiles: entries }));
    const before = expectOk(docFilter(parsed, {}));
    const input = {} as Record<string, never>;
    const after = docLink.transition(before, input);
    for (const post of docLink.post ?? []) {
      expect(post(before, after, input)).toBe(true);
    }
    for (const inv of docLink.invariant ?? []) {
      expect(inv(after)).toBe(true);
    }
  });
});

// === doc.analyze ===

describe('doc.analyze', () => {
  test('generates coverage report when enabled', () => {
    const state = makeInitialState();
    const entries = makeSourceFileEntries();
    const parsed = expectOk(docParse(state, { sourceFiles: entries }));
    const filtered = expectOk(docFilter(parsed, {}));
    const linked = expectOk(docLink(filtered, {} as Record<string, never>));

    const result = expectOk(docAnalyze(linked, { enabled: true }));
    expect(result.coverageReport).toBeDefined();
    expect(result.coverageReport?.contracts.length).toBe(result.linked.length);
  });

  test('skips coverage when disabled', () => {
    const state = makeInitialState();
    const entries = makeSourceFileEntries();
    const parsed = expectOk(docParse(state, { sourceFiles: entries }));
    const filtered = expectOk(docFilter(parsed, {}));
    const linked = expectOk(docLink(filtered, {} as Record<string, never>));

    const result = expectOk(docAnalyze(linked, { enabled: false }));
    expect(result.coverageReport).toBeUndefined();
  });

  test('post/invariant: hold when enabled', () => {
    const state = makeInitialState();
    const entries = makeSourceFileEntries();
    const parsed = expectOk(docParse(state, { sourceFiles: entries }));
    const filtered = expectOk(docFilter(parsed, {}));
    const before = expectOk(docLink(filtered, {} as Record<string, never>));
    const input = { enabled: true };
    const after = docAnalyze.transition(before, input);
    for (const post of docAnalyze.post ?? []) {
      expect(post(before, after, input)).toBe(true);
    }
    for (const inv of docAnalyze.invariant ?? []) {
      expect(inv(after)).toBe(true);
    }
  });

  test('post/invariant: hold when disabled', () => {
    const state = makeInitialState();
    const entries = makeSourceFileEntries();
    const parsed = expectOk(docParse(state, { sourceFiles: entries }));
    const filtered = expectOk(docFilter(parsed, {}));
    const before = expectOk(docLink(filtered, {} as Record<string, never>));
    const input = { enabled: false };
    const after = docAnalyze.transition(before, input);
    for (const post of docAnalyze.post ?? []) {
      expect(post(before, after, input)).toBe(true);
    }
    for (const inv of docAnalyze.invariant ?? []) {
      expect(inv(after)).toBe(true);
    }
  });
});

// === doc.render ===

describe('doc.render', () => {
  test('renders markdown from linked state', () => {
    const state = makeInitialState();
    const entries = makeSourceFileEntries();
    const parsed = expectOk(docParse(state, { sourceFiles: entries }));
    const filtered = expectOk(docFilter(parsed, {}));
    const linked = expectOk(docLink(filtered, {} as Record<string, never>));

    const result = expectOk(docRender(linked, {} as Record<string, never>));
    expect(result.markdown).toContain('# Test Docs');
    expect(result.markdown).toContain('cart.create');
  });

  test('renders title-only markdown for empty state', () => {
    const state = makeInitialState();

    const result = expectOk(docRender(state, {} as Record<string, never>));
    expect(result.markdown).toContain('# Test Docs');
  });

  test('post/invariant: hold after transition', () => {
    const state = makeInitialState();
    const entries = makeSourceFileEntries();
    const parsed = expectOk(docParse(state, { sourceFiles: entries }));
    const filtered = expectOk(docFilter(parsed, {}));
    const before = expectOk(docLink(filtered, {} as Record<string, never>));
    const input = {} as Record<string, never>;
    const after = docRender.transition(before, input);
    for (const post of docRender.post ?? []) {
      expect(post(before, after, input)).toBe(true);
    }
    for (const inv of docRender.invariant ?? []) {
      expect(inv(after)).toBe(true);
    }
  });
});

// === doc.generate scenario ===

describe('doc.generate scenario', () => {
  test('runs full pipeline', () => {
    const state = makeInitialState();
    const entries = makeSourceFileEntries();

    const result = expectOk(
      docGenerate(state, {
        sourceFiles: entries,
        coverageEnabled: false,
      })
    );

    expect(result.markdown).toContain('# Test Docs');
    expect(result.markdown).toContain('cart.create');
    expect(result.contracts.length).toBeGreaterThan(0);
    expect(result.linked.length).toBeGreaterThan(0);
  });

  test('runs full pipeline with coverage', () => {
    const state = makeInitialState();
    const entries = makeSourceFileEntries();

    const result = expectOk(
      docGenerate(state, {
        sourceFiles: entries,
        coverageEnabled: true,
      })
    );

    expect(result.coverageReport).toBeDefined();
    expect(result.markdown).toContain('Test Coverage');
  });

  test('runs full pipeline with filter', () => {
    const state = makeInitialState();
    const entries = makeSourceFileEntries();

    const result = expectOk(
      docGenerate(state, {
        sourceFiles: entries,
        filterIds: new Set(['cart.create']),
        coverageEnabled: false,
      })
    );

    expect(result.filtered.length).toBe(1);
    expect(result.markdown).toContain('cart.create');
  });

  test('parity: matches existing generate() output', () => {
    vi.spyOn(process, 'cwd').mockReturnValue(kataCliRoot);

    const expected = generate({
      title: 'Parity Test',
      contracts: ['tests/fixtures/cart-contracts.ts'],
      tests: ['tests/fixtures/cart-tests.ts'],
      locale: 'en',
      coverage: true,
    });

    vi.restoreAllMocks();

    // Now run the same through kata pipeline
    // We need to create source file entries from the fixture files
    const contractPath = resolve(
      kataCliRoot,
      'tests/fixtures/cart-contracts.ts'
    );
    const testPath = resolve(kataCliRoot, 'tests/fixtures/cart-tests.ts');

    const program = ts.createProgram([contractPath, testPath], {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      strict: true,
      noEmit: true,
    });

    const entries: SourceFileEntry[] = [];
    const contractSF = program.getSourceFile(contractPath);
    if (contractSF) {
      entries.push({
        path: contractPath,
        kind: 'contract',
        sourceFile: contractSF,
      });
      entries.push({
        path: contractPath,
        kind: 'scenario',
        sourceFile: contractSF,
      });
    }
    const testSF = program.getSourceFile(testPath);
    if (testSF) {
      entries.push({ path: testPath, kind: 'test', sourceFile: testSF });
    }

    const state = makeInitialState({
      title: 'Parity Test',
      description: undefined,
    });

    const result = expectOk(
      docGenerate(state, {
        sourceFiles: entries,
        coverageEnabled: true,
      })
    );

    expect(result.markdown).toBe(expected);
  });

  test('exposes scenario metadata', () => {
    expect(docGenerate.id).toBe('doc.generate');
    expect(docGenerate.description).toBe('ドキュメント生成パイプライン');
  });
});
