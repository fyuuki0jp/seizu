import type { SeizuConfig } from './src/doc/types';

export default {
  title: 'seizu-cli Contract Specification',
  description:
    'seizu-cli domain logic contracts — self-documenting dogfooding example',
  contracts: [
    'src/domain/pipeline.ts',
    'src/domain/render.ts',
    'src/domain/report.ts',
  ],
  scenarios: ['src/domain/pipeline.ts', 'src/domain/render.ts'],
  tests: [
    'tests/domain/pipeline.test.ts',
    'tests/domain/render.test.ts',
    'tests/domain/report.test.ts',
  ],
  exclude: ['tests/fixtures/**'],
  output: 'docs/contracts.md',
  locale: 'en',
  coverage: true,
  verify: {
    contracts: [],
  },
} satisfies SeizuConfig;
