import type { CAC } from 'cac';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  MockConfigError,
  loadConfigMock,
  getMessagesMock,
  resolveGlobsMock,
  createProgramFromFilesMock,
  formatCoverageReportMock,
  coverageGenerateMock,
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
    formatCoverageReportMock: vi.fn(),
    coverageGenerateMock: vi.fn(),
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

vi.mock('../src/coverage/reporters/terminal', () => ({
  formatCoverageReport: formatCoverageReportMock,
}));

vi.mock('../src/domain/pipeline', () => ({
  coverageGenerate: coverageGenerateMock,
}));

import { registerCoverageCommand } from '../src/commands/coverage';

type CoverageAction = (
  contracts: string[],
  options: Record<string, unknown>
) => Promise<void>;

function createCliHarness(): CoverageAction {
  let action: CoverageAction | undefined;

  const commandChain = {
    option: () => commandChain,
    action: (fn: CoverageAction) => {
      action = fn;
      return commandChain;
    },
  };

  const cli = {
    command: () => commandChain,
  } as unknown as CAC;

  registerCoverageCommand(cli);

  if (!action) {
    throw new Error('Action was not registered.');
  }

  return action;
}

function makeOptions(
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
  return {
    config: 'kata.config.ts',
    locale: undefined,
    json: false,
    ...overrides,
  };
}

function makeConfig() {
  return {
    title: 'Docs',
    contracts: ['contracts/**/*.ts'],
    tests: ['tests/**/*.ts'],
    verify: { contracts: [] },
  };
}

describe('registerCoverageCommand', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(process, 'cwd').mockReturnValue('/workspace');
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new ExitError(code);
    }) as never);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  test('uses config locale and prints formatted report', async () => {
    loadConfigMock.mockResolvedValue({
      config: { ...makeConfig(), locale: 'ja' },
    });
    getMessagesMock.mockReturnValue({ locale: 'ja' });
    resolveGlobsMock
      .mockReturnValueOnce(['/workspace/contracts.ts'])
      .mockReturnValueOnce(['/workspace/tests.ts']);
    createProgramFromFilesMock.mockReturnValue({
      getSourceFile: vi.fn(() => ({}) as object),
    });
    coverageGenerateMock.mockReturnValue({
      ok: true,
      value: {
        coverageReport: { summary: { testedContracts: 1 } },
      },
    });
    formatCoverageReportMock.mockReturnValue('formatted report');

    const action = createCliHarness();

    await expect(action(['cart.create'], makeOptions())).rejects.toMatchObject({
      code: 0,
    });

    expect(getMessagesMock).toHaveBeenCalledWith('ja');
    expect(coverageGenerateMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Docs' }),
      expect.objectContaining({ filterIds: new Set(['cart.create']) })
    );
    expect(console.log).toHaveBeenCalledWith('formatted report');
  });

  test('supports json output and explicit locale override', async () => {
    loadConfigMock.mockResolvedValue({
      config: { ...makeConfig(), locale: 'ja' },
    });
    getMessagesMock.mockReturnValue({ locale: 'en' });
    resolveGlobsMock
      .mockReturnValueOnce(['/workspace/contracts.ts'])
      .mockReturnValueOnce(['/workspace/tests.ts']);
    createProgramFromFilesMock.mockReturnValue({
      getSourceFile: vi.fn(() => ({}) as object),
    });
    coverageGenerateMock.mockReturnValue({
      ok: true,
      value: {
        coverageReport: {
          summary: {
            totalContracts: 1,
            testedContracts: 1,
          },
        },
      },
    });

    const action = createCliHarness();

    await expect(
      action([], makeOptions({ locale: 'en', json: true }))
    ).rejects.toMatchObject({ code: 0 });

    expect(getMessagesMock).toHaveBeenCalledWith('en');
    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify(
        {
          summary: {
            totalContracts: 1,
            testedContracts: 1,
          },
        },
        null,
        2
      )
    );
  });

  test('exits early when no source files are resolved', async () => {
    loadConfigMock.mockResolvedValue({
      config: makeConfig(),
    });
    getMessagesMock.mockReturnValue({ locale: 'en' });
    resolveGlobsMock.mockReturnValue([]);

    const action = createCliHarness();

    await expect(action([], makeOptions())).rejects.toMatchObject({ code: 0 });
    expect(console.log).toHaveBeenCalledWith('No source files found.');
    expect(coverageGenerateMock).not.toHaveBeenCalled();
  });

  test('handles pipeline failure', async () => {
    loadConfigMock.mockResolvedValue({
      config: makeConfig(),
    });
    getMessagesMock.mockReturnValue({ locale: 'en' });
    resolveGlobsMock
      .mockReturnValueOnce(['/workspace/contracts.ts'])
      .mockReturnValueOnce(['/workspace/tests.ts']);
    createProgramFromFilesMock.mockReturnValue({
      getSourceFile: vi.fn(() => ({}) as object),
    });
    coverageGenerateMock.mockReturnValue({
      ok: false,
      error: { stepIndex: 2, contractName: 'doc.link' },
    });

    const action = createCliHarness();

    await expect(action([], makeOptions())).rejects.toMatchObject({ code: 1 });
    expect(console.error).toHaveBeenCalledWith(
      'Pipeline failed at step 2: doc.link'
    );
  });

  test('handles ConfigError with exit code 2', async () => {
    loadConfigMock.mockRejectedValue(new MockConfigError('bad config'));

    const action = createCliHarness();

    await expect(action([], makeOptions())).rejects.toMatchObject({ code: 2 });
    expect(console.error).toHaveBeenCalledWith(
      'Configuration error: bad config'
    );
  });
});
