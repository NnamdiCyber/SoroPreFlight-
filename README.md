# 🚀 SoroPreFlight

### AI-Powered Pre-flight Simulation & Developer Experience Platform for Stellar / Soroban

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Stellar](https://img.shields.io/badge/Stellar-Soroban-7C3AED?logo=stellar)](https://soroban.stellar.org)
[![Built with Claude](https://img.shields.io/badge/AI-Claude%20Sonnet-FF6B35)](https://anthropic.com)
[![Status: Alpha](https://img.shields.io/badge/Status-Alpha-orange)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

> **SoroPreFlight** is an enterprise-grade, AI-powered simulation and validation platform designed for dev teams building on the **Stellar blockchain** with **Soroban smart contracts**. Before a single transaction hits the network — testnet or mainnet — SoroPreFlight runs a comprehensive pre-flight check: simulating execution, predicting gas/fee costs, catching logic errors, validating authorization flows, and surfacing actionable developer feedback powered by Claude AI.

---

## 📑 Table of Contents

- [Why SoroPreFlight?](#-why-soropreflight)
- [Key Features](#-key-features)
- [Architecture Overview](#-architecture-overview)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
- [Usage](#-usage)
  - [CLI](#cli-usage)
  - [SDK / API](#sdk--api-usage)
  - [Web Dashboard](#web-dashboard)
- [Pre-flight Checks](#-pre-flight-checks)
- [AI Analysis Engine](#-ai-analysis-engine)
- [Enterprise Features](#-enterprise-features)
- [Soroban Contract Integration](#-soroban-contract-integration)
- [Environment Support](#-environment-support)
- [Security Model](#-security-model)
- [CI/CD Integration](#-cicd-integration)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [Roadmap](#-roadmap)
- [License](#-license)

---

## 🌟 Why SoroPreFlight?

Building on Stellar/Soroban introduces unique challenges for dev teams and enterprises:

| Challenge | Without SoroPreFlight | With SoroPreFlight |
|---|---|---|
| Contract execution errors | Discovered on-chain (wasted fees) | Caught in simulation before submission |
| Gas/fee estimation | Manual, inaccurate guesses | Precise AI-assisted fee prediction |
| Auth & signer validation | Runtime failures | Pre-validated before broadcast |
| Contract upgrade safety | Risky blind deployments | Simulated upgrade path with diff analysis |
| Developer onboarding | Days of Soroban docs reading | AI-guided contextual feedback inline |
| Audit trail for enterprises | None by default | Full structured simulation logs |

SoroPreFlight gives your team **confidence before commitment** — every invoke, deploy, and upgrade is validated, explained, and optimized before it touches the Stellar network.

---

## ✨ Key Features

### 🧪 Pre-flight Simulation Engine
- **Dry-run transaction execution** against a local or forked Soroban RPC environment
- **State snapshot isolation** — simulations never mutate live ledger state
- **Multi-operation batch simulation** — validate entire transaction envelopes at once
- **Fork simulation** — replay against a specific ledger sequence for historical testing

### 🤖 AI-Powered Analysis (Claude Integration)
- **Natural language error explanations** — no more cryptic Soroban diagnostic codes
- **Fix suggestions** — AI recommends code changes for detected issues
- **Contract logic review** — submit WASM + source for AI-assisted audit pre-deployment
- **Fee optimization hints** — AI identifies inefficient contract patterns that inflate costs
- **Authorization flow analysis** — AI traces auth trees and flags missing signers

### 📊 Developer Experience (DX) Layer
- **Interactive simulation reports** — rich HTML/JSON output with call traces
- **VSCode extension** (coming soon) — inline pre-flight as you code
- **CLI with watch mode** — continuous simulation on file save
- **SDK for TypeScript/JavaScript** — drop-in DX layer for existing Stellar SDKs
- **Webhook support** — push simulation results to Slack, Teams, or any endpoint

### 🏢 Enterprise-Grade Features
- **Team workspaces** — shared simulation history and audit logs
- **Role-based access control (RBAC)** — control who can simulate against which environments
- **Compliance exports** — structured JSON/PDF reports for audit requirements
- **SSO integration** — SAML 2.0 / OIDC support
- **On-premise deployment** — full Docker/Kubernetes support for air-gapped environments

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        SoroPreFlight Platform                   │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────────────┐ │
│  │   CLI / SDK  │   │  Web Dashboard│   │   CI/CD Integrations│ │
│  │  (TypeScript)│   │   (React)    │   │  (GitHub / GitLab)  │ │
│  └──────┬───────┘   └──────┬───────┘   └──────────┬──────────┘ │
│         │                  │                       │            │
│         └──────────────────┼───────────────────────┘            │
│                            ▼                                    │
│              ┌─────────────────────────┐                        │
│              │    Pre-flight API Server │                        │
│              │   (Node.js / Fastify)   │                        │
│              └────────┬────────────────┘                        │
│                       │                                         │
│         ┌─────────────┼──────────────┐                          │
│         ▼             ▼              ▼                           │
│  ┌─────────────┐ ┌──────────┐ ┌──────────────────┐             │
│  │  Simulation │ │   AI     │ │   Audit & Logs   │             │
│  │   Engine    │ │  Engine  │ │   (PostgreSQL)   │             │
│  │  (Soroban   │ │  (Claude │ │                  │             │
│  │  RPC Fork)  │ │   API)   │ └──────────────────┘             │
│  └──────┬──────┘ └──────────┘                                   │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────┐                        │
│  │       Stellar / Soroban Network     │                        │
│  │  (Testnet  │  Futurenet  │ Mainnet) │                        │
│  └─────────────────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Soroban (Rust), Stellar XDR |
| Simulation Engine | `@stellar/stellar-sdk`, Soroban RPC `simulateTransaction` |
| AI Engine | Anthropic Claude API (`claude-sonnet-4`) |
| Backend API | Node.js, Fastify, TypeScript |
| Frontend | React 18, Tailwind CSS, Recharts |
| Database | PostgreSQL (audit logs), Redis (simulation cache) |
| Auth | JWT, SAML 2.0, OIDC |
| Deployment | Docker, Kubernetes, Helm charts |
| CI/CD | GitHub Actions, GitLab CI templates |
| Testing | Vitest, Soroban Test Harness |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **Rust** >= 1.74 (for local Soroban contract compilation)
- **Docker** >= 24.x (for local Soroban RPC node, optional)
- **Stellar CLI** >= 0.9.x — [Install guide](https://soroban.stellar.org/docs/getting-started/setup)
- An **Anthropic API key** — [Get one here](https://console.anthropic.com)
- A **Stellar account** (testnet or mainnet)

### Installation

#### Global CLI

```bash
npm install -g soropreflight
```

#### Project SDK

```bash
# npm
npm install @soropreflight/sdk

# yarn
yarn add @soropreflight/sdk

# pnpm
pnpm add @soropreflight/sdk
```

#### Self-hosted (Docker Compose)

```bash
git clone https://github.com/your-org/soropreflight.git
cd soropreflight
cp .env.example .env
# Edit .env with your credentials
docker compose up -d
```

### Configuration

Create a `soropreflight.config.json` in your project root:

```json
{
  "network": "testnet",
  "rpcUrl": "https://soroban-testnet.stellar.org",
  "networkPassphrase": "Test SDF Network ; September 2015",
  "ai": {
    "enabled": true,
    "model": "claude-sonnet-4",
    "analysisLevel": "deep"
  },
  "simulation": {
    "forkLedger": null,
    "timeout": 30000,
    "maxRetries": 3
  },
  "reporting": {
    "format": ["json", "html"],
    "outputDir": "./preflight-reports",
    "webhookUrl": null
  },
  "enterprise": {
    "workspaceId": null,
    "auditLog": true
  }
}
```

Or use environment variables:

```bash
SOROPREFLIGHT_NETWORK=testnet
SOROPREFLIGHT_RPC_URL=https://soroban-testnet.stellar.org
ANTHROPIC_API_KEY=sk-ant-...
STELLAR_SECRET_KEY=S...
```

---

## 📖 Usage

### CLI Usage

#### Simulate a contract invocation

```bash
# Basic simulation
soropreflight simulate \
  --contract CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX \
  --function transfer \
  --args '["GABC...", "GXYZ...", "1000000"]' \
  --source SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# With AI analysis
soropreflight simulate \
  --contract CXXX... \
  --function transfer \
  --args '["GABC...", "GXYZ...", "1000000"]' \
  --source SXXX... \
  --analyze

# Watch mode (re-simulate on file change)
soropreflight simulate --watch --contract CXXX... --function transfer
```

**Example Output:**

```
✅ Pre-flight Simulation: PASSED

┌─────────────────────────────────────────────┐
│  Contract:   CXXX...XXXX                    │
│  Function:   transfer                       │
│  Network:    Testnet                        │
│  Ledger:     12,845,231                     │
└─────────────────────────────────────────────┘

📊 Execution Summary
  Status:          SUCCESS
  Instructions:    142,880 / 100,000,000 (0.14%)
  Read Bytes:      2,304
  Write Bytes:     512
  Estimated Fee:   0.00124 XLM

🔐 Authorization
  ✅ Signer GABC... — authorized
  ✅ Signer GXYZ... — authorized

🤖 AI Analysis
  ✅ No issues detected.
  💡 Tip: The `transfer` function reads account entries on every call. 
     Consider caching the allowance check to reduce read bytes by ~30%.

📁 Report saved: ./preflight-reports/sim_20250605_143201.json
```

#### Simulate a contract deployment

```bash
soropreflight deploy \
  --wasm ./target/wasm32-unknown-unknown/release/my_contract.wasm \
  --source SXXX... \
  --analyze
```

#### Run a full pre-flight suite

```bash
# Run all simulations defined in soropreflight.config.json
soropreflight run --suite ./preflight/suite.yaml
```

### SDK / API Usage

```typescript
import { SoroPreFlight } from '@soropreflight/sdk';
import { Keypair, Networks } from '@stellar/stellar-sdk';

const preflight = new SoroPreFlight({
  network: 'testnet',
  rpcUrl: 'https://soroban-testnet.stellar.org',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY!,
});

// Simulate a contract invocation
const result = await preflight.simulate({
  contractId: 'CXXX...',
  method: 'transfer',
  args: [
    { type: 'address', value: 'GABC...' },
    { type: 'address', value: 'GXYZ...' },
    { type: 'i128', value: BigInt(1_000_000) },
  ],
  sourceAccount: Keypair.fromSecret(process.env.STELLAR_SECRET_KEY!),
  analyze: true,
});

if (result.status === 'SUCCESS') {
  console.log('✅ Safe to submit!');
  console.log('Estimated fee:', result.fee.estimated);
  console.log('AI insights:', result.ai.suggestions);
} else {
  console.error('❌ Pre-flight failed:', result.error.message);
  console.error('AI fix suggestion:', result.ai.fix);
  process.exit(1);
}
```

#### Batch simulation

```typescript
const batchResult = await preflight.simulateBatch([
  { contractId: 'CXXX...', method: 'mint', args: [...] },
  { contractId: 'CXXX...', method: 'transfer', args: [...] },
  { contractId: 'CYYY...', method: 'swap', args: [...] },
]);

batchResult.forEach((r, i) => {
  console.log(`Op ${i + 1}: ${r.status} | Fee: ${r.fee.estimated} XLM`);
});
```

### Web Dashboard

Start the dashboard locally:

```bash
soropreflight dashboard
# Opens at http://localhost:3141
```

Or access the hosted version (enterprise plan) at `https://app.soropreflight.io`.

Dashboard features:
- **Live simulation console** — paste XDR or build transactions interactively
- **Contract explorer** — browse deployed contracts and their ABI
- **Simulation history** — searchable log of all past simulations
- **AI chat** — ask questions about simulation results in plain English
- **Team feed** — see what your team is simulating in real time

---

## 🔍 Pre-flight Checks

SoroPreFlight runs the following checks on every simulation:

### Execution Checks
| Check | Description |
|---|---|
| `EXEC_SUCCESS` | Contract invocation returns without error |
| `EXEC_BUDGET` | Instruction count within safe budget limits |
| `EXEC_MEMORY` | Memory usage within Soroban limits |
| `EXEC_TIMEOUT` | Simulation completes within deadline |

### Fee & Resource Checks
| Check | Description |
|---|---|
| `FEE_ESTIMATE` | Computes base fee + resource fee accurately |
| `FEE_SURPLUS` | Warns if fee buffer is insufficient (< 20% surplus) |
| `LEDGER_READS` | Counts and prices ledger entry reads |
| `LEDGER_WRITES` | Counts and prices ledger entry writes |

### Authorization Checks
| Check | Description |
|---|---|
| `AUTH_SIGNERS` | All required signers are present |
| `AUTH_THRESHOLDS` | Multi-sig thresholds are met |
| `AUTH_SEQUENCE` | Account sequence numbers are valid |
| `AUTH_INVOCATIONS` | Sub-contract authorization trees are valid |

### Contract State Checks
| Check | Description |
|---|---|
| `STATE_FOOTPRINT` | Validates ledger footprint (read/write sets) |
| `STATE_EXPIRY` | Warns if contract data entries will expire soon |
| `STATE_COLLISION` | Detects concurrent write conflicts in batches |

### Deployment Checks (deploy only)
| Check | Description |
|---|---|
| `DEPLOY_WASM_VALID` | WASM binary is a valid Soroban contract |
| `DEPLOY_SIZE` | Contract size within network limits |
| `DEPLOY_UPGRADE_SAFE` | Upgrade compatibility check (storage schema diff) |
| `DEPLOY_HASH` | WASM hash matches expected value |

---

## 🤖 AI Analysis Engine

SoroPreFlight's AI layer is powered by **Anthropic Claude** and operates on three levels:

### Level 1: Error Explanation (`--analyze basic`)
Translates raw Soroban diagnostic codes and XDR error objects into plain English with context-specific remediation steps.

```
Raw Error: "HostError: Error { status: ContractError(1) }"
AI Explanation: "The contract returned error code 1, which in this token 
contract corresponds to InsufficientBalance. The sender account (GABC...) 
has a balance of 500,000 stroops but the transfer requires 1,000,000 stroops."
```

### Level 2: Optimization Analysis (`--analyze deep`)
Reviews the simulation call trace and resource usage to identify:
- Redundant ledger reads that inflate fees
- Hot paths with unnecessarily high instruction counts
- Storage layout inefficiencies
- Opportunities to batch operations

### Level 3: Contract Audit (`--analyze audit`)
Submits contract source code (Rust) alongside the simulation for a pre-deployment review:
- Logic vulnerabilities (integer overflow, reentrancy patterns)
- Access control gaps
- Economic attack surface (price manipulation, flash loan vectors)
- Deviation from Soroban best practices

> ⚠️ AI audit is advisory and does not replace a professional security audit. Use it for rapid iteration, not final sign-off.

---

## 🏢 Enterprise Features

### Workspaces & Teams

```bash
# Create a workspace
soropreflight workspace create --name "Acme DeFi Team"

# Invite team members
soropreflight workspace invite --email dev@acme.com --role developer

# Roles: owner | admin | developer | viewer
```

### Audit Logging

All simulations are logged with:
- Timestamp, user, and workspace
- Full simulation request/response (XDR + decoded)
- AI analysis output
- Pass/fail status for each check
- Git commit SHA (if run in CI)

Export audit logs:

```bash
soropreflight logs export \
  --from 2025-01-01 \
  --to 2025-06-05 \
  --format pdf \
  --output ./audit-q1-q2-2025.pdf
```

### RBAC Policy Example

```yaml
# rbac-policy.yaml
policies:
  - role: developer
    allow:
      - simulate:testnet
      - simulate:futurenet
      - deploy:testnet
    deny:
      - simulate:mainnet
      - deploy:mainnet

  - role: senior-engineer
    allow:
      - simulate:*
      - deploy:testnet

  - role: release-manager
    allow:
      - simulate:*
      - deploy:*
```

### SSO Configuration

```json
{
  "sso": {
    "provider": "okta",
    "entryPoint": "https://acme.okta.com/app/soropreflight/sso/saml",
    "certificate": "MIIDpDCCA...",
    "attributeMapping": {
      "email": "user.email",
      "name": "user.displayName",
      "groups": "user.groups"
    }
  }
}
```

---

## 🔗 Soroban Contract Integration

### Annotate your contracts for richer pre-flight output

Add `#[preflight]` doc comments to your Soroban contract functions:

```rust
/// @preflight:description Transfer tokens between accounts
/// @preflight:auth-required sender
/// @preflight:state-writes token_balance:sender, token_balance:recipient
/// @preflight:estimated-instructions 120000-160000
pub fn transfer(
    env: Env,
    from: Address,
    to: Address,
    amount: i128,
) -> Result<(), ContractError> {
    from.require_auth();
    // ...
}
```

SoroPreFlight reads these annotations to:
- Cross-validate actual vs expected resource usage
- Verify declared auth requirements match simulation
- Alert if estimated instruction range is exceeded

### Test Harness Integration

```typescript
import { PreflightTestHarness } from '@soropreflight/sdk/testing';

describe('Token contract', () => {
  let harness: PreflightTestHarness;

  beforeEach(async () => {
    harness = await PreflightTestHarness.create({
      contractPath: './target/wasm32-unknown-unknown/release/token.wasm',
      network: 'futurenet',
    });
  });

  it('transfer should pass pre-flight', async () => {
    const result = await harness.simulate('transfer', [
      harness.account('alice'),
      harness.account('bob'),
      BigInt(1_000_000),
    ]);

    expect(result.status).toBe('SUCCESS');
    expect(result.checks.AUTH_SIGNERS).toBe('PASS');
    expect(result.fee.estimated).toBeLessThan(0.01); // XLM
  });
});
```

---

## 🌐 Environment Support

| Environment | RPC URL | Network Passphrase |
|---|---|---|
| Mainnet | `https://soroban-rpc.stellar.org` | `Public Global Stellar Network ; September 2015` |
| Testnet | `https://soroban-testnet.stellar.org` | `Test SDF Network ; September 2015` |
| Futurenet | `https://rpc-futurenet.stellar.org` | `Test SDF Future Network ; October 2022` |
| Local (Docker) | `http://localhost:8000/soroban/rpc` | `Standalone Network ; February 2017` |

### Running a local Soroban node

```bash
docker run --rm -p 8000:8000 \
  --name stellar \
  stellar/quickstart:soroban-dev \
  --standalone \
  --enable-soroban-rpc
```

---

## 🔒 Security Model

- **No private keys leave your environment.** SoroPreFlight never uploads secret keys. Signing happens locally; only the XDR envelope is sent for simulation.
- **Simulation is read-only.** The Soroban RPC `simulateTransaction` endpoint does not submit to the network.
- **AI analysis is opt-in.** Contract source and ABI are only sent to the Claude API when `--analyze` is explicitly set.
- **Audit logs are encrypted at rest** (AES-256-GCM) in the enterprise tier.
- **Network isolation** — on-premise deployments can be fully air-gapped; the AI engine can be pointed to a self-hosted Claude API-compatible endpoint.

### Data sent to Anthropic API (when `--analyze` is enabled)

| Data | Sent? |
|---|---|
| Transaction XDR | ✅ Yes (decoded, no keys) |
| Contract WASM / source | ✅ Yes (audit mode only) |
| Simulation result | ✅ Yes |
| Account secret keys | ❌ Never |
| Full ledger state | ❌ Never |

---

## ⚙️ CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/soroban-preflight.yml
name: Soroban Pre-flight Check

on: [push, pull_request]

jobs:
  preflight:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build contract
        run: cargo build --target wasm32-unknown-unknown --release

      - name: Run SoroPreFlight
        uses: soropreflight/github-action@v1
        with:
          network: testnet
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          stellar-secret-key: ${{ secrets.STELLAR_TEST_SECRET }}
          suite: ./preflight/ci-suite.yaml
          fail-on: ERROR,WARN
```

### GitLab CI

```yaml
soroban-preflight:
  image: node:18
  stage: validate
  script:
    - npm install -g soropreflight
    - soropreflight run --suite ./preflight/ci-suite.yaml --ci
  variables:
    ANTHROPIC_API_KEY: $ANTHROPIC_API_KEY
    STELLAR_SECRET_KEY: $STELLAR_TEST_SECRET
  artifacts:
    reports:
      junit: preflight-reports/junit.xml
    paths:
      - preflight-reports/
```

### Simulation Suite YAML

```yaml
# preflight/ci-suite.yaml
name: Token Contract CI Suite
network: testnet

setup:
  deploy:
    wasm: ./target/wasm32-unknown-unknown/release/token.wasm
    source: $STELLAR_SECRET_KEY
    alias: token_contract

simulations:
  - name: mint tokens
    contract: token_contract
    function: mint
    args:
      - type: address
        value: $TEST_ACCOUNT
      - type: i128
        value: 1000000000
    expect:
      status: SUCCESS
      max_fee_xlm: 0.02

  - name: transfer tokens
    contract: token_contract
    function: transfer
    args:
      - type: address
        value: $TEST_ACCOUNT
      - type: address
        value: $RECIPIENT_ACCOUNT
      - type: i128
        value: 500000000
    expect:
      status: SUCCESS
      checks:
        AUTH_SIGNERS: PASS
        FEE_SURPLUS: PASS

  - name: reject unauthorized transfer
    contract: token_contract
    function: transfer
    args:
      - type: address
        value: $UNAUTHORIZED_ACCOUNT
      - type: address
        value: $RECIPIENT_ACCOUNT
      - type: i128
        value: 500000000
    expect:
      status: FAIL
      error_contains: "unauthorized"
```

---

## 🗂 Project Structure

```
soropreflight/
│
├── packages/
│   ├── cli/                          # @soropreflight/cli — global CLI tool
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── simulate.ts       # `soropreflight simulate` command
│   │   │   │   ├── deploy.ts         # `soropreflight deploy` command
│   │   │   │   ├── run.ts            # `soropreflight run --suite` command
│   │   │   │   ├── dashboard.ts      # `soropreflight dashboard` command
│   │   │   │   ├── workspace.ts      # `soropreflight workspace` commands
│   │   │   │   └── logs.ts           # `soropreflight logs` command
│   │   │   ├── output/
│   │   │   │   ├── reporter.ts       # Terminal output formatter
│   │   │   │   ├── html-report.ts    # HTML report generator
│   │   │   │   └── json-report.ts    # JSON report generator
│   │   │   └── index.ts              # CLI entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── sdk/                          # @soropreflight/sdk — TypeScript SDK
│   │   ├── src/
│   │   │   ├── SoroPreFlight.ts      # Main SDK class
│   │   │   ├── simulate.ts           # Simulation API
│   │   │   ├── batch.ts              # Batch simulation
│   │   │   ├── types.ts              # Shared TypeScript types
│   │   │   └── index.ts              # Public exports
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── core/                         # @soropreflight/core — shared engine
│   │   ├── src/
│   │   │   ├── engine/
│   │   │   │   ├── SimulationEngine.ts    # Soroban RPC simulation wrapper
│   │   │   │   ├── ForkManager.ts         # Ledger fork/snapshot management
│   │   │   │   └── ResourceEstimator.ts   # Fee & resource estimation
│   │   │   ├── checks/
│   │   │   │   ├── ExecChecks.ts          # Execution checks (budget, memory)
│   │   │   │   ├── FeeChecks.ts           # Fee & resource checks
│   │   │   │   ├── AuthChecks.ts          # Authorization checks
│   │   │   │   ├── StateChecks.ts         # Ledger state checks
│   │   │   │   └── DeployChecks.ts        # Deployment-specific checks
│   │   │   ├── ai/
│   │   │   │   ├── AIAnalysisEngine.ts    # Claude API integration
│   │   │   │   ├── ErrorExplainer.ts      # Level 1: error translation
│   │   │   │   ├── OptimizationAdvisor.ts # Level 2: optimization hints
│   │   │   │   └── ContractAuditor.ts     # Level 3: source audit
│   │   │   ├── parsers/
│   │   │   │   ├── XDRParser.ts           # XDR encode/decode helpers
│   │   │   │   └── DiagnosticsParser.ts   # Soroban diagnostic parser
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── api/                          # REST API server
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── simulate.ts       # POST /simulate
│   │   │   │   ├── deploy.ts         # POST /deploy/simulate
│   │   │   │   ├── logs.ts           # GET  /logs
│   │   │   │   └── workspace.ts      # CRUD /workspace
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts           # JWT / SAML middleware
│   │   │   │   └── rbac.ts           # Role-based access control
│   │   │   ├── db/
│   │   │   │   ├── schema.sql        # PostgreSQL schema
│   │   │   │   └── migrations/       # Database migrations
│   │   │   └── server.ts             # Fastify server entry point
│   │   └── package.json
│   │
│   └── dashboard/                    # Web dashboard (React)
│       ├── src/
│       │   ├── components/
│       │   │   ├── SimulationConsole/    # Live simulation UI
│       │   │   ├── ResultViewer/         # Simulation result display
│       │   │   ├── ContractExplorer/     # ABI browser
│       │   │   ├── AIChat/               # AI chat interface
│       │   │   └── TeamFeed/             # Real-time team activity
│       │   ├── pages/
│       │   │   ├── Dashboard.tsx
│       │   │   ├── History.tsx
│       │   │   └── Settings.tsx
│       │   └── main.tsx
│       └── package.json
│
├── preflight/                        # Example simulation suites
│   ├── ci-suite.yaml                 # CI/CD simulation suite template
│   └── examples/
│       ├── token-suite.yaml
│       └── defi-suite.yaml
│
├── docker/
│   ├── Dockerfile                    # Production image
│   ├── Dockerfile.dev                # Development image
│   └── docker-compose.yml            # Full stack compose
│
├── helm/                             # Kubernetes Helm chart
│   └── soropreflight/
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
│
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Test & lint on PR
│       ├── release.yml               # Publish npm packages on tag
│       └── soroban-preflight.yml     # Example consumer workflow
│
├── soropreflight.config.json         # Example project config
├── .env.example                      # Environment variable template
├── package.json                      # Monorepo root (npm workspaces)
├── turbo.json                        # Turborepo build pipeline
└── README.md
```

---

## 🤝 Contributing

We welcome contributions from the Stellar developer community!

```bash
# Fork and clone
git clone https://github.com/your-org/soropreflight.git
cd soropreflight

# Install dependencies
npm install

# Run tests
npm test

# Run the dev server
npm run dev
```

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for our code of conduct and pull request process.

### Development Setup

```bash
# Start local Soroban node
docker compose -f docker-compose.dev.yml up -d

# Copy env
cp .env.example .env.local
# Fill in ANTHROPIC_API_KEY and STELLAR_SECRET_KEY

# Start API server
npm run dev:api

# Start dashboard (separate terminal)
npm run dev:dashboard
```

## 📄 License

SoroPreFlight is released under the [MIT License](LICENSE).

---

## 🙏 Acknowledgments

- [Stellar Development Foundation](https://stellar.org) for Soroban and the stellar-sdk
- [Anthropic](https://anthropic.com) for the Claude API
- The Stellar developer community for feedback and testing

---

<p align="center">
  Built with ❤️ for the Stellar ecosystem<br/>
  <a href="https://soroban.stellar.org">Soroban Docs</a> · 
  <a href="https://discord.gg/stellar">Stellar Discord</a> · 
  <a href="https://github.com/your-org/soropreflight/issues">Report an Issue</a>
</p>
