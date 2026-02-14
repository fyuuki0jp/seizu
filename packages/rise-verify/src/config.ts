import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Arbitrary } from 'fast-check';
import type { Contract } from 'rise';

export interface ContractEntry<
  TState = unknown,
  TInput = unknown,
  TError = unknown,
> {
  readonly contract: Contract<TState, TInput, TError>;
  readonly state: Arbitrary<TState>;
  readonly input: Arbitrary<TInput>;
}

export interface RiseVerifyConfig {
  readonly contracts: ContractEntry[];
}

export interface ResolvedConfig {
  readonly config: RiseVerifyConfig;
  readonly filePath: string;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export async function loadConfig(configPath?: string): Promise<ResolvedConfig> {
  const filePath = configPath ?? 'rise-verify.config.ts';
  const absolutePath = resolve(process.cwd(), filePath);

  if (!existsSync(absolutePath)) {
    throw new ConfigError(`Config file not found: ${absolutePath}`);
  }

  const module = await import(absolutePath);
  const config = (module.default ?? module) as RiseVerifyConfig;

  if (!config?.contracts || !Array.isArray(config.contracts)) {
    throw new ConfigError(
      'Config must export a default object with { contracts: ContractEntry[] }'
    );
  }

  return { config, filePath: absolutePath };
}
