import { getContractMode } from './config';
import type { Result } from './result';
import { err, ok } from './result';
import type { Contract, ContractDef, ContractOptions } from './types';

export class TransitionPanic extends Error {
  override readonly name = 'TransitionPanic';
  constructor(contractName: string, cause: unknown) {
    super(
      `Transition panic in "${contractName}": ${cause instanceof Error ? cause.message : String(cause)}`
    );
    this.cause = cause;
  }
}

export class PostconditionViolation extends Error {
  override readonly name = 'PostconditionViolation';
  constructor(contractName: string, label: string, reason: string) {
    super(`Postcondition "${label}" violated in "${contractName}": ${reason}`);
  }
}

export class InvariantViolation extends Error {
  override readonly name = 'InvariantViolation';
  constructor(contractName: string, label: string, reason: string) {
    super(`Invariant "${label}" violated in "${contractName}": ${reason}`);
  }
}

export function define<TState, TInput, TError>(
  name: string,
  body: Omit<ContractDef<TState, TInput, TError>, 'name'>,
  options?: ContractOptions
): Contract<TState, TInput, TError> {
  const def = { name, ...body };
  const execute = (state: TState, input: TInput): Result<TState, TError> => {
    const mode = options?.mode ?? getContractMode();

    for (const guard of def.pre) {
      if (mode === 'strict') {
        try {
          const result = guard.fn(state, input);
          if (!result.ok) return err(result.error);
        } catch (e) {
          throw new TransitionPanic(name, e);
        }
      } else {
        const result = guard.fn(state, input);
        if (!result.ok) return err(result.error);
      }
    }

    let newState: TState;
    if (mode === 'strict') {
      try {
        newState = def.transition(state, input);
      } catch (e) {
        throw new TransitionPanic(name, e);
      }
    } else {
      newState = def.transition(state, input);
    }

    if (mode === 'strict') {
      if (def.post) {
        for (const cond of def.post) {
          const condResult = cond.fn(state, newState, input);
          if (condResult !== true) {
            throw new PostconditionViolation(
              name,
              cond.label,
              typeof condResult === 'string' ? condResult : 'condition failed'
            );
          }
        }
      }

      if (def.invariant) {
        for (const inv of def.invariant) {
          const invResult = inv.fn(newState);
          if (invResult !== true) {
            throw new InvariantViolation(
              name,
              inv.label,
              typeof invResult === 'string' ? invResult : 'invariant failed'
            );
          }
        }
      }
    }

    return ok(newState);
  };
  Object.defineProperty(execute, 'name', {
    value: name,
    configurable: true,
  });
  return Object.assign(execute, body) as Contract<TState, TInput, TError>;
}
