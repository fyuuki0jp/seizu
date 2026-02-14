import type { KataDocConfig } from './src/doc/types';

export default {
  title: 'kata-cli Contract Specification',
  description:
    'kata-cli domain logic contracts — self-documenting dogfooding example',
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
  output: 'docs/contracts.md',
  locale: 'en',
  coverage: true,
} satisfies KataDocConfig;
