# seizu

**State Engine for Invariant-driven Zero-defect Unification**

seizu (星図) is a contract-based state transition library for TypeScript. It enables AI agents and developers to produce trustworthy code with minimal review overhead, accelerating development cycles.

## Packages

| Package | Description |
|---------|-------------|
| [seizu](./packages/seizu) | Core library (zero dependencies). `define()`, `scenario()`, Result utilities. |
| [seizu-cli](./packages/seizu-cli) | CLI tooling. Static analysis, documentation generation, PBT verification. |

## Development

```bash
# Prerequisites: Node.js >= 20, pnpm
pnpm install
pnpm build
pnpm test
pnpm lint
```

## Links

- [Documentation](https://fyuuki0jp.github.io/seizu/)
- [Contract Specification](https://fyuuki0jp.github.io/seizu/en/contracts/) (dogfooding)

## License

MIT
