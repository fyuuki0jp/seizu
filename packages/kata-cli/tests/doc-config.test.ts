import { resolve } from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { ConfigError, loadConfig } from '../src/doc/config';

const fixturesDir = resolve(__dirname, 'fixtures');

describe('doc loadConfig', () => {
  test('throws ConfigError when file does not exist', async () => {
    await expect(loadConfig('nonexistent.config.ts')).rejects.toThrow(
      ConfigError
    );
    await expect(loadConfig('nonexistent.config.ts')).rejects.toThrow(
      'Config file not found'
    );
  });

  test('ConfigError has correct name', () => {
    const error = new ConfigError('test message');
    expect(error.name).toBe('ConfigError');
    expect(error.message).toBe('test message');
    expect(error).toBeInstanceOf(Error);
  });

  test('throws ConfigError when title is missing', async () => {
    const configPath = resolve(fixturesDir, 'no-title-doc-config.ts');
    await expect(loadConfig(configPath)).rejects.toThrow(ConfigError);
    await expect(loadConfig(configPath)).rejects.toThrow('title');
  });

  test('throws ConfigError when contracts is missing', async () => {
    const configPath = resolve(fixturesDir, 'no-contracts-doc-config.ts');
    await expect(loadConfig(configPath)).rejects.toThrow(ConfigError);
    await expect(loadConfig(configPath)).rejects.toThrow('contracts');
  });

  test('loads valid config successfully', async () => {
    vi.spyOn(process, 'cwd').mockReturnValue(resolve(__dirname, '..'));
    const configPath = resolve(fixturesDir, 'valid-doc-config.ts');
    const result = await loadConfig(configPath);
    expect(result.config.title).toBe('Test Documentation');
    expect(result.config.contracts).toEqual([
      'tests/fixtures/cart-contracts.ts',
    ]);
    expect(result.filePath).toBe(configPath);
    vi.restoreAllMocks();
  });
});
