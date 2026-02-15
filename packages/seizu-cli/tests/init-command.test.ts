import type { CAC } from 'cac';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  initScaffoldMock,
  generateRequirementsMock,
  lstatSyncMock,
  mkdirSyncMock,
  writeFileSyncMock,
} = vi.hoisted(() => ({
  initScaffoldMock: vi.fn(),
  generateRequirementsMock: vi.fn(),
  lstatSyncMock: vi.fn(),
  mkdirSyncMock: vi.fn(),
  writeFileSyncMock: vi.fn(),
}));

class ExitError extends Error {
  readonly code: number | undefined;
  constructor(code: number | undefined) {
    super(`process.exit(${String(code)})`);
    this.code = code;
  }
}

vi.mock('../src/init', () => ({
  initScaffold: initScaffoldMock,
}));

vi.mock('../src/init/requirements', () => ({
  generateRequirements: generateRequirementsMock,
}));

vi.mock('node:fs', () => ({
  lstatSync: lstatSyncMock,
  mkdirSync: mkdirSyncMock,
  writeFileSync: writeFileSyncMock,
}));

import { registerInitCommand } from '../src/commands/init';

type InitAction = (options: Record<string, unknown>) => void;

function createCliHarness(): InitAction {
  let action: InitAction | undefined;

  const commandChain = {
    option: () => commandChain,
    action: (fn: InitAction) => {
      action = fn;
      return commandChain;
    },
  };

  const cli = {
    command: () => commandChain,
  } as unknown as CAC;

  registerInitCommand(cli);

  if (!action) {
    throw new Error('Action was not registered.');
  }

  return action;
}

function makeOptions(
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> {
  return {
    claude: true,
    force: false,
    dryRun: false,
    withRequirements: false,
    ...overrides,
  };
}

describe('registerInitCommand', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(process, 'cwd').mockReturnValue('/workspace');
    vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new ExitError(code);
    }) as never);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  test('registers the init command on CLI', () => {
    const commandSpy = vi.fn().mockReturnValue({
      option: vi.fn().mockReturnThis(),
      action: vi.fn().mockReturnThis(),
    });
    const cli = { command: commandSpy } as unknown as CAC;

    registerInitCommand(cli);

    expect(commandSpy).toHaveBeenCalledWith(
      'init',
      'Initialize seizu project scaffolding'
    );
  });

  test('exits with code 2 when --claude is not specified', () => {
    const action = createCliHarness();

    expect(() => action(makeOptions({ claude: false }))).toThrow(ExitError);
    expect(console.error).toHaveBeenCalledWith(
      'Platform flag required. Use --claude to generate Claude Code scaffolding.'
    );
  });

  test('calls initScaffold and exits 0 on success', () => {
    initScaffoldMock.mockReturnValue({
      files: [
        {
          path: '.claude/skills/seizu/SKILL.md',
          status: 'created',
          content: '# skill',
        },
        {
          path: 'seizu.config.ts',
          status: 'created',
          content: 'export default {}',
        },
      ],
    });

    const action = createCliHarness();

    expect(() => action(makeOptions())).toThrow(ExitError);
    expect(initScaffoldMock).toHaveBeenCalledWith('/workspace', {
      force: false,
      dryRun: false,
    });
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('SKILL.md')
    );
  });

  test('dry-run does not write files', () => {
    initScaffoldMock.mockReturnValue({
      files: [
        {
          path: '.claude/skills/seizu/SKILL.md',
          status: 'created',
          content: '# skill',
        },
        {
          path: 'seizu.config.ts',
          status: 'created',
          content: 'export default {}',
        },
      ],
    });

    const action = createCliHarness();

    expect(() => action(makeOptions({ dryRun: true }))).toThrow(ExitError);
    expect(initScaffoldMock).toHaveBeenCalledWith('/workspace', {
      force: false,
      dryRun: true,
    });
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[dry-run]')
    );
  });

  test('existing files are skipped without --force', () => {
    initScaffoldMock.mockReturnValue({
      files: [
        {
          path: '.claude/skills/seizu/SKILL.md',
          status: 'skipped',
          content: '# skill',
        },
        {
          path: 'seizu.config.ts',
          status: 'skipped',
          content: 'export default {}',
        },
      ],
    });

    const action = createCliHarness();

    expect(() => action(makeOptions())).toThrow(ExitError);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('skipped')
    );
  });

  test('force overwrites existing files', () => {
    initScaffoldMock.mockReturnValue({
      files: [
        {
          path: '.claude/skills/seizu/SKILL.md',
          status: 'overwritten',
          content: '# skill',
        },
        {
          path: 'seizu.config.ts',
          status: 'overwritten',
          content: 'export default {}',
        },
      ],
    });

    const action = createCliHarness();

    expect(() => action(makeOptions({ force: true }))).toThrow(ExitError);
    expect(initScaffoldMock).toHaveBeenCalledWith('/workspace', {
      force: true,
      dryRun: false,
    });
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('overwritten')
    );
  });

  test('--with-requirements generates requirements.md', () => {
    initScaffoldMock.mockReturnValue({
      files: [
        {
          path: '.claude/skills/seizu/SKILL.md',
          status: 'created',
          content: '# skill',
        },
        {
          path: 'seizu.config.ts',
          status: 'created',
          content: 'export default {}',
        },
      ],
    });
    generateRequirementsMock.mockReturnValue('# Requirements\n');
    lstatSyncMock.mockImplementation(() => {
      const err = new Error('ENOENT') as NodeJS.ErrnoException;
      err.code = 'ENOENT';
      throw err;
    });

    const action = createCliHarness();

    expect(() => action(makeOptions({ withRequirements: true }))).toThrow(
      ExitError
    );
    expect(generateRequirementsMock).toHaveBeenCalled();
    expect(writeFileSyncMock).toHaveBeenCalledWith(
      expect.stringContaining('requirements.md'),
      '# Requirements\n',
      'utf-8'
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('requirements.md')
    );
  });

  test('--with-requirements skips existing requirements.md without --force', () => {
    initScaffoldMock.mockReturnValue({ files: [] });
    generateRequirementsMock.mockReturnValue('# Requirements\n');
    lstatSyncMock.mockReturnValue({ isSymbolicLink: () => false });

    const action = createCliHarness();

    expect(() => action(makeOptions({ withRequirements: true }))).toThrow(
      ExitError
    );
    expect(writeFileSyncMock).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('skipped')
    );
  });
});
