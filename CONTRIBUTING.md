# Contributing to RISE

Thank you for your interest in contributing to RISE! This document provides guidelines and information about contributing.

## Development Setup

### Prerequisites

- Node.js >= 20
- pnpm >= 10

### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/rise.git
   cd rise
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Run tests:
   ```bash
   pnpm test
   ```

## Development Workflow

### Scripts

- `pnpm build` - Build the package
- `pnpm test` - Run tests
- `pnpm lint` - Check code with Biome
- `pnpm lint:fix` - Auto-fix linting issues
- `pnpm format` - Format code with Biome

### Code Style

We use [Biome](https://biomejs.dev/) for linting and formatting. The pre-commit hook will automatically check your code.

## Pull Request Process

1. Create a new branch for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Write/update tests as needed
4. Ensure all tests pass: `pnpm test`
5. Ensure linting passes: `pnpm lint`
6. Commit your changes with a descriptive message
7. Push to your fork and open a Pull Request

### Commit Message Guidelines

We follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Build/tooling changes

Example: `feat: add snapshot interval configuration`

## Reporting Issues

- Use the GitHub issue tracker
- Search existing issues before creating a new one
- Provide a minimal reproduction if possible
- Include relevant version information

## License

By contributing to RISE, you agree that your contributions will be licensed under the MIT License.

## Test Coverage

RISE maintains high test coverage (≥80% for all metrics). 

### Running Coverage Tests

To generate and view coverage reports:

```bash
pnpm test:coverage
open coverage/index.html  # macOS
# or
xdg-open coverage/index.html  # Linux
```

### Coverage Requirements

- Lines: ≥80%
- Functions: ≥80%
- Branches: ≥80%
- Statements: ≥80%

If coverage falls below these thresholds, CI will fail. Please add tests to cover new code paths.
