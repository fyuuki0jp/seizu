import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ContractEntry } from 'kata/verify';

export type { ContractEntry } from 'kata/verify';

export interface KataVerifyConfig {
  readonly contracts: ContractEntry[];
}

export interface ResolvedConfig {
  readonly config: KataVerifyConfig;
  readonly filePath: string;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export async function loadConfig(configPath?: string): Promise<ResolvedConfig> {
  const filePath = configPath ?? 'kata-verify.config.ts';
  const absolutePath = resolve(process.cwd(), filePath);

  if (!existsSync(absolutePath)) {
    throw new ConfigError(`Config file not found: ${absolutePath}`);
  }

  const module = await import(absolutePath);
  const config = (module.default ?? module) as KataVerifyConfig;

  if (!config?.contracts || !Array.isArray(config.contracts)) {
    throw new ConfigError(
      'Config must export a default object with { contracts: ContractEntry[] }'
    );
  }

  return { config, filePath: absolutePath };
}
