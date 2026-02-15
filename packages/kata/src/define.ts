import type { Result } from './result';
import { err, ok } from './result';
import type { Contract, ContractDef } from './types';

export function define<TState, TInput, TError>(
  name: string,
  body: Omit<ContractDef<TState, TInput, TError>, 'name'>
): Contract<TState, TInput, TError> {
  const def = { name, ...body };
  const execute = (state: TState, input: TInput): Result<TState, TError> => {
    for (const guard of def.pre) {
      const result = guard.fn(state, input);
      if (!result.ok) return err(result.error);
    }
    return ok(def.transition(state, input));
  };
  Object.defineProperty(execute, 'name', {
    value: name,
    configurable: true,
  });
  return Object.assign(execute, body) as Contract<TState, TInput, TError>;
}
