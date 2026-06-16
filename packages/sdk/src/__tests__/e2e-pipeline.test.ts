import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@soropreflight/core', async () => {
  const actual = await vi.importActual('@soropreflight/core');

  const mockFee = {
    minFee: 100,
    maxFee: 5000,
    recommendedFee: 350,
    feeSurplusPercent: 50,
    instructions: 100000,
    maxInstructions: 100_000_000,
    readBytes: 1024,
    writeBytes: 512,
  };

  const mockSimResult = {
    id: 'e2e-test-id',
    status: 'SUCCESS',
    network: 'testnet',
    ledger: 12345678,
    contractId: 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE',
    method: 'transfer',
    fee: mockFee,
    auth: [{ signer: 'GDS4N3XYQN3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5', authorized: true }],
    checks: {},
    checkResults: [],
    raw: { latestLedger: 12345678 },
    timestamp: new Date().toISOString(),
  };

  const mockEngine = {
    simulate: vi.fn().mockResolvedValue(mockSimResult),
    getServer: vi.fn(),
    getForkManager: vi.fn(),
    getResourceEstimator: vi.fn(),
  };

  const mockCheckRunner = {
    runSimulationChecks: vi.fn(() => [
      { check: 'EXEC_SUCCESS', status: 'PASS', message: 'Execution successful', severity: 'info' },
      { check: 'EXEC_BUDGET', status: 'PASS', message: 'Instructions within budget', severity: 'info' },
      { check: 'FEE_ESTIMATE', status: 'PASS', message: 'Fee within range', severity: 'info' },
      { check: 'FEE_SURPLUS', status: 'PASS', message: 'Fee surplus OK', severity: 'info' },
      { check: 'AUTH_SIGNERS', status: 'PASS', message: 'All signers present', severity: 'info' },
    ]),
    getChecksMap: vi.fn(() => ({
      EXEC_SUCCESS: 'PASS', EXEC_BUDGET: 'PASS',
      FEE_ESTIMATE: 'PASS', FEE_SURPLUS: 'PASS',
      AUTH_SIGNERS: 'PASS',
    })),
    getSummary: vi.fn(() => ({ total: 5, passed: 5, failed: 0, warned: 0, skipped: 0, status: 'PASS' })),
    runDeployChecks: vi.fn(() => []),
  };

  const mockAiEngine = {
    analyze: vi.fn().mockResolvedValue({
      level: 'basic',
      summary: 'Transfer simulation completed successfully',
      suggestions: ['No issues detected'],
      errorExplanation: {
        raw: '',
        explanation: 'Transfer simulation completed successfully',
        relevantAccounts: [],
        remediation: ['No issues detected'],
      },
    }),
    setApiKey: vi.fn(),
    isConfigured: vi.fn().mockReturnValue(true),
  };

  const mockConfig = {
    network: 'testnet',
    rpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
    ai: { enabled: true, model: 'claude-sonnet-4', analysisLevel: 'basic' },
    simulation: { forkLedger: null, timeout: 30000, maxRetries: 3 },
    reporting: { format: ['json', 'html'], outputDir: './reports', webhookUrl: null },
    enterprise: { workspaceId: null, auditLog: true },
    anthropicApiKey: 'mock-key',
  };

  return {
    ...(actual as object),
    SimulationEngine: { create: vi.fn(() => mockEngine) },
    CheckRunner: vi.fn(() => mockCheckRunner),
    AIAnalysisEngine: vi.fn(() => mockAiEngine),
    loadConfig: vi.fn(() => mockConfig),
    NETWORKS: {
      mainnet: { rpcUrl: 'https://soroban-rpc.stellar.org', networkPassphrase: 'Public Global Stellar Network ; September 2015' },
      testnet: { rpcUrl: 'https://soroban-testnet.stellar.org', networkPassphrase: 'Test SDF Network ; September 2015' },
      futurenet: { rpcUrl: 'https://rpc-futurenet.stellar.org', networkPassphrase: 'Test SDF Future Network ; October 2022' },
      local: { rpcUrl: 'http://localhost:8000/soroban/rpc', networkPassphrase: 'Standalone Network ; February 2017' },
    },
  };
});

import { SoroPreFlight } from '../SoroPreFlight';

describe('E2E: SDK → Core → Checks → AI Pipeline', () => {
  let sdk: SoroPreFlight;

  beforeEach(() => {
    sdk = new SoroPreFlight({
      network: 'testnet',
      rpcUrl: 'https://soroban-testnet.stellar.org',
      anthropicApiKey: 'mock-key',
    });
  });

  it('should simulate a token transfer end-to-end', async () => {
    const result = await sdk.simulate({
      contractId: 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE',
      method: 'transfer',
      args: [
        { type: 'address', value: 'GDS4N3XYQN3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5' },
        { type: 'address', value: 'GC5R3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5' },
        { type: 'i128', value: '500' },
      ],
      sourceAccount: 'GDS4N3XYQN3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5',
      analyze: true,
      analysisLevel: 'basic',
    });

    expect(result).toBeDefined();
    expect(result.status).toBe('SUCCESS');
    expect(result.contractId).toBe('CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE');
    expect(result.method).toBe('transfer');
    expect(result.network).toBe('testnet');
    expect(result.fee).toBeDefined();
    expect(result.fee.recommendedFee).toBeGreaterThan(0);
    expect(result.auth).toHaveLength(1);
    expect(result.auth[0].authorized).toBe(true);
    expect(result.checkResults.length).toBeGreaterThan(0);
    expect(result.checks).toBeDefined();
    expect(result.ai).toBeDefined();
    expect(result.ai?.level).toBe('basic');
    expect(result.ai?.summary).toBeTruthy();
  }, 10000);

  it('should run checks and return check results', async () => {
    const result = await sdk.simulate({
      contractId: 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE',
      method: 'transfer',
      args: [
        { type: 'address', value: 'GDS4N3XYQN3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5' },
        { type: 'address', value: 'GC5R3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5' },
        { type: 'i128', value: '500' },
      ],
      sourceAccount: 'GDS4N3XYQN3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5',
      requiredSigners: ['GDS4N3XYQN3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5'],
    });

    const passChecks = result.checkResults.filter(c => c.status === 'PASS');
    expect(passChecks.length).toBeGreaterThanOrEqual(3);
  });

  it('should simulate batch operations', async () => {
    const batchResult = await sdk.simulateBatch({
      operations: [
        {
          contractId: 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE',
          method: 'balance',
          args: [{ type: 'address', value: 'GDS4N3XYQN3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5' }],
          sourceAccount: 'GDS4N3XYQN3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5',
        },
        {
          contractId: 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE',
          method: 'transfer',
          args: [
            { type: 'address', value: 'GDS4N3XYQN3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5' },
            { type: 'address', value: 'GC5R3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5' },
            { type: 'i128', value: '500' },
          ],
          sourceAccount: 'GDS4N3XYQN3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5',
        },
      ],
      concurrency: 2,
    });

    expect(batchResult.status).toBe('ALL_PASS');
    expect(batchResult.results).toHaveLength(2);
    expect(batchResult.collisions).toEqual([]);
  });

  it('should deploy a contract with analysis', async () => {
    const deployResult = await sdk.deploy({
      wasm: 'AGFzbQEAAAAB',
      sourceAccount: 'GDS4N3XYQN3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5',
      analyze: true,
      analysisLevel: 'basic',
    });

    expect(deployResult).toBeDefined();
    expect(deployResult.status).toBe('SUCCESS');
    expect(deployResult).toHaveProperty('wasmHash');
    expect(deployResult).toHaveProperty('checkResults');
  });

  it('should return proper SDK configuration', () => {
    const config = sdk.getConfig();
    expect(config.network).toBe('testnet');
    expect(config.rpcUrl).toBe('https://soroban-testnet.stellar.org');
  });

  it('should return engine, checkRunner, and aiEngine instances', () => {
    expect(sdk.getEngine()).toBeDefined();
    expect(sdk.getCheckRunner()).toBeDefined();
    expect(sdk.getAIEngine()).toBeDefined();
  });
});
