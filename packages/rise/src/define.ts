import type { Result } from './result';
import { err, ok } from './result';
import type { Contract, ContractDef } from './types';

export function define<TState, TInput, TError>(
  def: ContractDef<TState, TInput, TError>
): Contract<TState, TInput, TError> {
  const execute = (state: TState, input: TInput): Result<TState, TError> => {
    for (const guard of def.pre) {
      const result = guard(state, input);
      if (!result.ok) return err(result.error);
    }
    return ok(def.transition(state, input));
  };
  return Object.assign(execute, def);
}
