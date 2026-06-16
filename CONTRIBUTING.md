# Contributing to SoroPreFlight

Thank you for your interest in contributing to SoroPreFlight! This guide will help you get started.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Code Conventions](#code-conventions)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Development Setup

### Prerequisites

- **Node.js** >= 18.0.0 (npm 10+)
- **Rust** (for Soroban contract development) — install via [rustup](https://rustup.rs/)
- **Soroban CLI** (optional, for contract deployment)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/your-org/soropreflight.git
cd soropreflight

# Install all dependencies (uses npm workspaces)
npm install

# Build all packages
npm run build

# Run all tests
npm run test
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Key environment variables:

| Variable | Description | Required |
|---|---|---|
| `SOROPREFLIGHT_NETWORK` | Target network (mainnet/testnet/futurenet/local) | Yes |
| `SOROPREFLIGHT_RPC_URL` | Soroban RPC endpoint | Yes |
| `ANTHROPIC_API_KEY` | Claude API key for AI analysis | For AI features |
| `STELLAR_SECRET_KEY` | Stellar secret key for simulations | For signing |

### Workspace Commands

```bash
npm run build    # Build all packages via Turborepo
npm run test     # Run all tests
npm run lint     # Lint all packages
npm run dev      # Watch mode for development
npm run clean    # Clean build artifacts
```

## Project Structure

```
soropreflight/
├── packages/
│   ├── core/        # Shared engine: simulation, checks, AI, parsers, types
│   ├── sdk/         # TypeScript SDK: main API for consumers
│   ├── cli/         # CLI tool (soropreflight)
│   ├── api/         # REST API server (Fastify)
│   └── dashboard/   # Web dashboard (React + Vite)
├── contracts/
│   └── example-token/  # Soroban token contract for testing
├── docker/          # Docker Compose and Dockerfiles
├── helm/            # Kubernetes Helm chart
├── preflight/       # Example simulation suites
└── .github/         # GitHub Actions workflows
```

### Package Dependencies

```
CLI  →  SDK  →  Core
API  →  SDK  →  Core
Dashboard  →  API
```

## Code Conventions

### TypeScript

- **Target:** ES2022, CommonJS modules
- **Strict mode** enabled in all packages
- Use explicit types — avoid `any` unless necessary
- Follow existing patterns in the codebase
- All public APIs must have TypeScript type exports

### Import Style

```typescript
// Good — named imports from barrel exports
import { SimulationEngine } from '@soropreflight/core';

// Avoid — deep imports into internal modules
import { SimulationEngine } from '@soropreflight/core/engine/SimulationEngine';
```

### Naming

- **Classes:** PascalCase (`SimulationEngine`, `CheckRunner`)
- **Functions/variables:** camelCase (`runSimulation`, `loadConfig`)
- **Types/interfaces:** PascalCase (`SimulationResult`, `CheckResult`)
- **Enums:** PascalCase (`PreflightCheck`, `CheckStatus`)
- **Files:** PascalCase for classes/modules (`SimulationEngine.ts`), camelCase for utilities
- **Constants:** UPPER_SNAKE_CASE (`DEFAULT_TIMEOUT`, `BUDGET_LIMITS`)

### Error Handling

- Use typed error objects, not bare strings
- Return structured error results instead of throwing where possible
- Wrap external API errors in domain-specific error types

### Testing

- Write tests alongside code in `__tests__/` directories
- Use Vitest for all test files
- Mock external dependencies (RPC, API calls)
- Aim for >80% coverage on new code

## Testing

### Running Tests

```bash
# All tests
npm run test

# Specific package
npm run test -w packages/core

# With coverage
npm run test -- -- --coverage

# Watch mode
npm run test -- -- --watch
```

### Test Structure

```
src/
├── module.ts
└── __tests__/
    └── module.test.ts
```

### Mocking Conventions

- Mock `@stellar/stellar-sdk` for engine tests
- Mock `@anthropic-ai/sdk` for AI tests
- Use factory functions to create test data

## Pull Request Process

1. **Create a feature branch** from `main` or `develop`
   - Branch naming: `feature/description`, `fix/description`, `chore/description`

2. **Make your changes** following the code conventions

3. **Write or update tests** for your changes

4. **Run the full test suite** locally:
   ```bash
   npm run build && npm run test && npm run lint
   ```

5. **Open a pull request** with a clear description:
   - What problem does this solve?
   - How does it work?
   - Any breaking changes?
   - Screenshots for UI changes

6. **Address review feedback** — all checks must pass before merge

7. **Squash merge** into the target branch

### PR Checklist

- [ ] Code follows project conventions
- [ ] Tests added/updated and passing
- [ ] Documentation updated (if applicable)
- [ ] Changeset added (if applicable)
- [ ] No new `any` types introduced
- [ ] No secrets or credentials exposed

## Release Process

1. Maintainers tag a release:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```

2. GitHub Actions `release.yml` workflow:
   - Builds all packages
   - Runs full test suite
   - Publishes to npm with provenance
   - Creates a GitHub Release with release notes

3. Packages are published individually:
   - `@soropreflight/core`
   - `@soropreflight/sdk`
   - `@soropreflight/cli`
   - `@soropreflight/api`

## Getting Help

- Open an issue for bugs or feature requests
- Join the discussion in pull requests
- Check the README for usage examples
