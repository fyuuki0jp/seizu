import type { ContractMode } from './types';

let globalMode: ContractMode = 'production';

export function setContractMode(mode: ContractMode): void {
  globalMode = mode;
}

export function getContractMode(): ContractMode {
  return globalMode;
}
