import type { CAC } from 'cac';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  MockConfigError,
  loadConfigMock,
  getMessagesMock,
  resolveGlobsMock,
  createProgramFromFilesMock,
  renderMarkdownMock,
  docGenerateMock,
  existsSyncMock,
  mkdirSyncMock,
  readFileSyncMock,
  writeFileSyncMock,
} = vi.hoisted(() => {
  class MockConfigError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ConfigError';
    }
  }

  return {
    MockConfigError,
    loadConfigMock: vi.fn(),
    getMessagesMock: vi.fn(),
    resolveGlobsMock: vi.fn(),
    createProgramFromFilesMock: vi.fn(),
    renderMarkdownMock: vi.fn(),
    docGenerateMock: vi.fn(),
    existsSyncMock: vi.fn(),
    mkdirSyncMock: vi.fn(),
    readFileSyncMock: vi.fn(),
    writeFileSyncMock: vi.fn(),
  };
});

class ExitError extends Error {
  readonly code: number | undefined;

  constructor(code: number | undefined) {
    super(`process.exit(${String(code)})`);
    this.code = code;
  }
}

vi.mock('../src/config', () => ({
  ConfigError: MockConfigError,
  loadConfig: loadConfigMock,
}));

vi.mock('../src/doc/i18n/index', () => ({
  getMessages: getMessagesMock,
}));

vi.mock('../src/doc/parser/source-resolver', () => ({
  createProgramFromFiles: createProgramFromFilesMock,
  resolveGlobs: resolveGlobsMock,
}));

vi.mock('../src/doc/renderer/markdown', () => ({
  renderMarkdown: renderMarkdownMock,
}));

vi.mock('../src/domain/pipeline', () => ({
  docGenerate: docGenerateMock,
}));

vi.mock('node:fs', () => ({
  existsSync: existsSyncMock,
  mkdirSync: mkdirSyncMock,
  readFileSync: readFileSyncMock,
  writeFileSync: writeFileSyncMock,
}));

import { registerDocCommand } from '../src/commands/doc';

type DocAction = (
  contracts: string[],
  options: Record<string, unknown>
) => Promise<void>;

function createCliHarness(): { readonly cli: CAC; readonly action: DocAction } {
  let action: DocAction | undefined;

  const commandChain = {
    option: () => commandChain,
    action: (fn: DocAction) => {
      action = fn;
      return commandChain;
    },
  };

  const cli = {
    command: () => commandChain,
  } as unknown as CAC;

  registerDocCommand(cli);

  if (!action) {
    throw new Error('Action was not registered.');
  }

  return { cli, action };
}

function makeOptions(
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
  return {
    config: 'kata.config.ts',
    output: undefined,
    title: undefined,
    locale: undefined,
    coverage: false,
    flow: undefined,
    check: false,
    flowDebugOutput: undefined,
    stdout: false,
    ...overrides,
  };
}

function makeFlow(ownerKind: 'contract' | 'scenario', ownerName: string) {
  return {
    ownerKind,
    ownerName,
    graph: { nodes: [], edges: [] },
    mermaid: 'graph TD',
    hash: `${ownerKind}-${ownerName}`,
    summary: {
      stepCount: 0,
      branchCount: 0,
      errorPathCount: 0,
      unsupportedCount: 0,
    },
  };
}

describe('registerDocCommand', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(process, 'cwd').mockReturnValue('/workspace');
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new ExitError(code);
    }) as never);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(process.stdout, 'write').mockImplementation((() => true) as never);
  });

  test('uses config locale when --locale is omitted', async () => {
    loadConfigMock.mockResolvedValue({
      config: {
        title: 'Doc',
        contracts: ['contracts/**/*.ts'],
        locale: 'ja',
        verify: { contracts: [] },
      },
    });
    getMessagesMock.mockReturnValue({ locale: 'ja' });
    resolveGlobsMock.mockReturnValue([]);
    renderMarkdownMock.mockReturnValue('# generated');

    const { action } = createCliHarness();

    await expect(
      action([], makeOptions({ stdout: true }))
    ).rejects.toMatchObject({ code: 0 });

    expect(getMessagesMock).toHaveBeenCalledWith('ja');
    expect(process.stdout.write).toHaveBeenCalledWith('# generated');
    expect(docGenerateMock).not.toHaveBeenCalled();
  });

  test('runs pipeline, writes flow debug json, and writes markdown file', async () => {
    loadConfigMock.mockResolvedValue({
      config: {
        title: 'Doc',
        contracts: ['contracts/**/*.ts'],
        verify: { contracts: [] },
      },
    });
    getMessagesMock.mockReturnValue({ locale: 'en' });
    resolveGlobsMock
      .mockReturnValueOnce(['/workspace/contracts/cart.ts'])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([]);
    createProgramFromFilesMock.mockReturnValue({
      getSourceFile: vi.fn(() => ({}) as object),
    });
    docGenerateMock.mockReturnValue({
      ok: true,
      value: {
        markdown: '# from pipeline',
        linked: [{ contract: { flow: makeFlow('contract', 'b') } }],
        linkedScenarios: [{ scenario: { flow: makeFlow('scenario', 'a') } }],
      },
    });

    const { action } = createCliHarness();

    await expect(
      action(
        ['cart.create'],
        makeOptions({
          output: 'docs/out.md',
          flowDebugOutput: 'tmp/flow-debug.json',
        })
      )
    ).rejects.toMatchObject({ code: 0 });

    expect(docGenerateMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Doc' }),
      expect.objectContaining({
        coverageEnabled: false,
        filterIds: new Set(['cart.create']),
      })
    );

    expect(writeFileSyncMock).toHaveBeenCalledTimes(2);
    expect(
      writeFileSyncMock.mock.calls.some((call) =>
        String(call[0]).includes('tmp/flow-debug.json')
      )
    ).toBe(true);
    expect(
      writeFileSyncMock.mock.calls.some(
        (call) =>
          String(call[0]).includes('docs/out.md') &&
          call[1] === '# from pipeline'
      )
    ).toBe(true);
  });

  test('exits with code 1 when pipeline fails', async () => {
    loadConfigMock.mockResolvedValue({
      config: {
        title: 'Doc',
        contracts: ['contracts/**/*.ts'],
        verify: { contracts: [] },
      },
    });
    getMessagesMock.mockReturnValue({ locale: 'en' });
    resolveGlobsMock
      .mockReturnValueOnce(['/workspace/contracts/cart.ts'])
      .mockReturnValueOnce([])
      .mockReturnValueOnce([]);
    createProgramFromFilesMock.mockReturnValue({
      getSourceFile: vi.fn(() => ({}) as object),
    });
    docGenerateMock.mockReturnValue({
      ok: false,
      error: { stepIndex: 2, contractName: 'doc.render' },
    });

    const { action } = createCliHarness();

    await expect(action([], makeOptions())).rejects.toMatchObject({ code: 1 });
    expect(console.error).toHaveBeenCalledWith(
      'Pipeline failed at step 2: doc.render'
    );
  });

  test('supports check mode for missing/outdated/up-to-date output', async () => {
    loadConfigMock.mockResolvedValue({
      config: {
        title: 'Doc',
        contracts: ['contracts/**/*.ts'],
        verify: { contracts: [] },
      },
    });
    getMessagesMock.mockReturnValue({ locale: 'en' });
    resolveGlobsMock.mockReturnValue([]);
    renderMarkdownMock.mockReturnValue('# current');

    const { action } = createCliHarness();

    existsSyncMock.mockReturnValueOnce(false);
    await expect(
      action([], makeOptions({ check: true, output: 'docs/contracts.md' }))
    ).rejects.toMatchObject({ code: 1 });
    expect(console.error).toHaveBeenCalledWith(
      'Documentation file not found: /workspace/docs/contracts.md'
    );

    existsSyncMock.mockReturnValueOnce(true);
    readFileSyncMock.mockReturnValueOnce('# old');
    await expect(
      action([], makeOptions({ check: true, output: 'docs/contracts.md' }))
    ).rejects.toMatchObject({ code: 1 });
    expect(console.error).toHaveBeenCalledWith(
      'Documentation is out of date: /workspace/docs/contracts.md\nRun: kata doc --config kata.config.ts'
    );

    existsSyncMock.mockReturnValueOnce(true);
    readFileSyncMock.mockReturnValueOnce('# current');
    await expect(
      action([], makeOptions({ check: true, output: 'docs/contracts.md' }))
    ).rejects.toMatchObject({ code: 0 });
    expect(console.log).toHaveBeenCalledWith(
      'Documentation is up to date: /workspace/docs/contracts.md'
    );
  });

  test('handles ConfigError with exit code 2', async () => {
    loadConfigMock.mockRejectedValue(new MockConfigError('invalid config'));

    const { action } = createCliHarness();

    await expect(action([], makeOptions())).rejects.toMatchObject({ code: 2 });
    expect(console.error).toHaveBeenCalledWith(
      'Configuration error: invalid config'
    );
  });
});
