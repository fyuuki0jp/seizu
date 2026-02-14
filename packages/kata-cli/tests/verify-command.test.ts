import type { CAC } from 'cac';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  MockConfigError,
  loadConfigMock,
  verifyMock,
  summaryMock,
  jsonMock,
  replayMock,
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
    verifyMock: vi.fn(),
    summaryMock: vi.fn(),
    jsonMock: vi.fn(),
    replayMock: vi.fn(),
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

vi.mock('kata/verify', () => ({
  verify: verifyMock,
}));

vi.mock('../src/verify/reporters/summary', () => ({
  summary: summaryMock,
}));

vi.mock('../src/verify/reporters/json', () => ({
  json: jsonMock,
}));

vi.mock('../src/verify/reporters/replay', () => ({
  replay: replayMock,
}));

import { registerVerifyCommand } from '../src/commands/verify';

type VerifyAction = (
  contracts: string[],
  options: Record<string, unknown>
) => Promise<void>;

function createCliHarness(): VerifyAction {
  let action: VerifyAction | undefined;

  const commandChain = {
    option: () => commandChain,
    action: (fn: VerifyAction) => {
      action = fn;
      return commandChain;
    },
  };

  const cli = {
    command: () => commandChain,
  } as unknown as CAC;

  registerVerifyCommand(cli);

  if (!action) {
    throw new Error('Action was not registered.');
  }

  return action;
}

function makeOptions(
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
  return {
    reporter: 'summary',
    runs: '100',
    config: 'kata.config.ts',
    seed: undefined,
    path: undefined,
    ...overrides,
  };
}

function makeEntries() {
  return [
    {
      contract: { id: 'cart.create' },
      state: {},
      input: {},
    },
    {
      contract: { id: 'cart.addItem' },
      state: {},
      input: {},
    },
  ];
}

describe('registerVerifyCommand', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new ExitError(code);
    }) as never);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  test('runs verify with parsed options and summary reporter', async () => {
    loadConfigMock.mockResolvedValue({
      config: {
        title: 'Docs',
        contracts: [],
        verify: { contracts: makeEntries() },
      },
    });
    verifyMock.mockReturnValue({ success: true });
    summaryMock.mockReturnValue('summary output');

    const action = createCliHarness();

    await expect(action([], makeOptions({ runs: '25' }))).rejects.toMatchObject(
      { code: 0 }
    );

    expect(verifyMock).toHaveBeenCalledWith(makeEntries(), {
      numRuns: 25,
      seed: undefined,
      path: undefined,
    });
    expect(summaryMock).toHaveBeenCalledWith({ success: true });
    expect(console.log).toHaveBeenCalledWith('summary output');
  });

  test('exits with code 2 for unknown reporter', async () => {
    loadConfigMock.mockResolvedValue({
      config: {
        title: 'Docs',
        contracts: [],
        verify: { contracts: makeEntries() },
      },
    });
    verifyMock.mockReturnValue({ success: false });
    summaryMock.mockReturnValue('fallback summary');

    const action = createCliHarness();

    await expect(
      action(
        ['cart.addItem'],
        makeOptions({
          reporter: 'unknown',
          seed: '42',
          path: '0:1:0',
        })
      )
    ).rejects.toMatchObject({ code: 2 });

    expect(console.error).toHaveBeenCalledWith('Unknown reporter: unknown');
    expect(verifyMock).not.toHaveBeenCalled();
    expect(summaryMock).not.toHaveBeenCalled();
  });

  test('exits with code 2 when contract filter matches nothing', async () => {
    loadConfigMock.mockResolvedValue({
      config: {
        title: 'Docs',
        contracts: [],
        verify: { contracts: makeEntries() },
      },
    });

    const action = createCliHarness();

    await expect(
      action(['unknown.contract'], makeOptions())
    ).rejects.toMatchObject({ code: 2 });
    expect(console.error).toHaveBeenCalledWith(
      'No contracts matched: unknown.contract'
    );
    expect(verifyMock).not.toHaveBeenCalled();
  });

  test('handles ConfigError with exit code 2', async () => {
    loadConfigMock.mockRejectedValue(
      new MockConfigError('invalid verify config')
    );

    const action = createCliHarness();

    await expect(action([], makeOptions())).rejects.toMatchObject({ code: 2 });
    expect(console.error).toHaveBeenCalledWith(
      'Configuration error: invalid verify config'
    );
  });
});
