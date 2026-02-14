import { describe, expect, test, vi } from 'vitest';
import type { Contract } from '../../src/types';

const { verifyContractMock } = vi.hoisted(() => ({
  verifyContractMock: vi.fn(),
}));

vi.mock('../../src/verify/runner', () => ({
  verify: vi.fn(),
  verifyContract: verifyContractMock,
}));

import { assertContractValid } from '../../src/verify/index';

type State = { readonly value: number };
type Input = { readonly amount: number };
type Err = { readonly tag: string };

function makeContract(): Contract<State, Input, Err> {
  const execute = (state: State) => ({ ok: true as const, value: state });
  return Object.assign(execute, {
    id: 'cart.addItem',
    pre: [],
    transition: (state: State) => state,
  }) as Contract<State, Input, Err>;
}

describe('assertContractValid message formatting', () => {
  test('omits undefined seed/path and uses unknown violation label', () => {
    verifyContractMock.mockReturnValue({
      checks: [
        {
          id: 'guard.exists',
          kind: 'pre',
          status: 'failed',
          runs: 1,
          violation: undefined,
          seed: undefined,
          path: undefined,
        },
      ],
    });

    let message = '';
    try {
      assertContractValid(
        makeContract(),
        { state: {} as never, input: {} as never },
        { numRuns: 1 }
      );
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain('[unknown violation] guard.exists');
    expect(message).not.toContain('undefined');
  });
});
