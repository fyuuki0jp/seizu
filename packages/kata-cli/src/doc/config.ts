import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { KataDocConfig } from './types';

export interface ResolvedConfig {
  readonly config: KataDocConfig;
  readonly filePath: string;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export async function loadConfig(configPath?: string): Promise<ResolvedConfig> {
  const filePath = configPath ?? 'kata-doc.config.ts';
  const absolutePath = resolve(process.cwd(), filePath);

  if (!existsSync(absolutePath)) {
    throw new ConfigError(`Config file not found: ${absolutePath}`);
  }

  const module = await import(absolutePath);
  const config = (module.default ?? module) as KataDocConfig;

  if (!config?.title || typeof config.title !== 'string') {
    throw new ConfigError(
      'Config must export a default object with { title: string, contracts: string[] }'
    );
  }

  if (!config?.contracts || !Array.isArray(config.contracts)) {
    throw new ConfigError(
      'Config must export a default object with { contracts: string[] } (glob patterns)'
    );
  }

  return { config, filePath: absolutePath };
}
