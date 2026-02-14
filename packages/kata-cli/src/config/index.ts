import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { KataConfig } from '../doc/types';

export interface ResolvedConfig {
  readonly config: KataConfig;
  readonly filePath: string;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validateConfig(config: unknown): asserts config is KataConfig {
  if (!isRecord(config)) {
    throw new ConfigError('Config must export a default object.');
  }

  if (!config.title || typeof config.title !== 'string') {
    throw new ConfigError(
      'Config must export a default object with { title: string, contracts: string[] }'
    );
  }

  if (!config.contracts || !Array.isArray(config.contracts)) {
    throw new ConfigError(
      'Config must export a default object with { contracts: string[] } (glob patterns)'
    );
  }

  if (!isRecord(config.verify) || !Array.isArray(config.verify.contracts)) {
    throw new ConfigError(
      'Config must export a default object with { verify: { contracts: ContractEntry[] } }'
    );
  }
}

export async function loadConfig(configPath?: string): Promise<ResolvedConfig> {
  const filePath = configPath ?? 'kata.config.ts';
  const absolutePath = resolve(process.cwd(), filePath);

  if (!existsSync(absolutePath)) {
    throw new ConfigError(`Config file not found: ${absolutePath}`);
  }

  const module = (await import(pathToFileURL(absolutePath).href)) as {
    readonly default?: unknown;
  };
  const rawConfig = module.default;

  validateConfig(rawConfig);
  return { config: rawConfig, filePath: absolutePath };
}
