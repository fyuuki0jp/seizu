/** Generate the content for `seizu.config.ts`. */
export function renderSeizuConfig(): string {
  return `\
import type { SeizuConfig } from 'seizu-cli';

export default {
  title: 'Contract Specification',
  description: '',
  contracts: ['src/**/*.contract.ts'],
  scenarios: ['src/**/*.scenario.ts'],
  tests: ['tests/**/*.test.ts'],
  output: 'docs/contracts.md',
  locale: 'en',
  coverage: true,
  verify: {
    contracts: [],
  },
} satisfies SeizuConfig;
`;
}
