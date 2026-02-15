# seizu-cli

CLI tooling for [seizu](https://github.com/fyuuki0jp/rise/tree/main/packages/seizu) contracts. Static analysis, documentation generation, and Property-Based Testing verification.

## Install

```bash
npm install -g seizu-cli

# or run directly
npx seizu
```

## Commands

### `seizu init`

Scaffold a new seizu project with config files and Claude Code skill integration.

```bash
seizu init
```

### `seizu doc`

Generate contract specification documents from source code using TypeScript AST analysis.

```bash
seizu doc --config seizu.config.ts
seizu doc --config seizu.config.ts --locale ja
seizu doc --config seizu.config.ts --check  # CI: verify docs are up-to-date
```

### `seizu verify`

Run Property-Based Testing against all contracts defined in config.

```bash
seizu verify --config seizu.config.ts
```

### `seizu coverage`

Report contract coverage metrics.

```bash
seizu coverage --config seizu.config.ts
```

## Configuration

Create a `seizu.config.ts` in your project root:

```typescript
import type { SeizuConfig } from 'seizu-cli';

const config: SeizuConfig = {
  title: 'My Project',
  description: 'Contract specifications',
  doc: {
    contracts: './src/**/*.contract.ts',
    output: './docs/contracts.md',
  },
  verify: {
    contracts: [
      {
        contract: myContract,
        state: stateArbitrary,
        input: inputArbitrary,
      },
    ],
  },
};

export default config;
```

## Programmatic API

seizu-cli also exports its document generation types for programmatic use:

```typescript
import type { SeizuConfig, SeizuDocConfig, SeizuVerifyConfig } from 'seizu-cli';
```

## License

MIT
