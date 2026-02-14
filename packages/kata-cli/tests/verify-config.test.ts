import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import { ConfigError, loadConfig } from '../src/verify/config';

const fixturesDir = resolve(__dirname, 'fixtures');

describe('verify loadConfig', () => {
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

  test('throws ConfigError when contracts is missing', async () => {
    const configPath = resolve(fixturesDir, 'no-contracts-verify-config.ts');
    await expect(loadConfig(configPath)).rejects.toThrow(ConfigError);
    await expect(loadConfig(configPath)).rejects.toThrow('contracts');
  });
});
