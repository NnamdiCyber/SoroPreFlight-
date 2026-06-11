import { describe, it, expect } from 'vitest';
import { CheckRunner } from '../CheckRunner';
import { PreflightCheck, SimulationResult, DeployResult, CheckResult } from '../../types';
import { BUDGET_LIMITS } from '../../constants';

function makeSimResult(overrides: Partial<SimulationResult> = {}): SimulationResult {
  return {
    id: 'test-id',
    status: 'SUCCESS',
    network: 'testnet',
    ledger: 12345,
    contractId: 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE',
    method: 'increment',
    fee: {
      minFee: 100,
      maxFee: 5000,
      recommendedFee: 350,
      feeSurplusPercent: 50,
      instructions: 100000,
      maxInstructions: BUDGET_LIMITS.maxInstructions,
      readBytes: 2304,
      writeBytes: 512,
    },
    auth: [{ signer: 'GAAA…aaaa', authorized: true }],
    checks: {},
    checkResults: [],
    raw: {
      cost: { cpuInsns: '100000', memBytes: '4096' },
      result: { auth: ['entry1'] },
      transactionData: {},
      stateChanges: [{ key: 'k1', type: 'written', ttl: 50000 }],
    },
    timestamp: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeDeployResult(overrides: Partial<DeployResult> = {}): DeployResult {
  return {
    status: 'SUCCESS',
    contractId: 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE',
    wasmHash: 'abc123def456',
    checks: {},
    checkResults: [],
    ...overrides,
  };
}

describe('CheckRunner', () => {
  it('should run simulation checks and return results', () => {
    const runner = new CheckRunner();
    const result = makeSimResult();
    const results = runner.runSimulationChecks(result);

    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.check && r.status && r.message && r.severity)).toBe(true);
  });

  it('should run deploy checks and return results', () => {
    const runner = new CheckRunner();
    const result = makeDeployResult();
    const results = runner.runDeployChecks(result);

    expect(results).toHaveLength(4);
  });

  it('should provide summary with all pass', () => {
    const runner = new CheckRunner();
    const result = makeSimResult();
    const results = runner.runSimulationChecks(result);
    const summary = runner.getSummary(results);

    expect(summary.total).toBeGreaterThan(0);
    expect(summary.failed).toBe(0);
    expect(summary.status).toBe('PASS');
  });

  it('should return FAIL summary when checks fail', () => {
    const runner = new CheckRunner();
    const result = makeSimResult({
      status: 'FAIL',
      error: { code: 'CONTRACT_ERROR', message: 'HostError' },
    });
    const results = runner.runSimulationChecks(result);
    const summary = runner.getSummary(results);

    expect(summary.failed).toBeGreaterThan(0);
    expect(summary.status).toBe('FAIL');
  });

  it('should return WARN summary when only warnings', () => {
    const runner = new CheckRunner();
    const failingResult = makeSimResult({
      fee: {
        ...makeSimResult().fee,
        instructions: Math.floor(BUDGET_LIMITS.maxInstructions * 0.96),
      },
      raw: {
        cost: { cpuInsns: String(Math.floor(BUDGET_LIMITS.maxInstructions * 0.96)), memBytes: '4096' },
        result: { auth: ['entry1'] },
        transactionData: {},
        stateChanges: [{ key: 'k1', type: 'written', ttl: 50000 }],
      },
    });
    const results = runner.runSimulationChecks(failingResult);
    const summary = runner.getSummary(results);

    expect(summary.warned).toBeGreaterThan(0);
    expect(summary.status).toBe('WARN');
  });

  it('should generate checks map from results', () => {
    const runner = new CheckRunner();
    const results: CheckResult[] = [
      {
        check: PreflightCheck.EXEC_SUCCESS,
        status: 'PASS',
        message: 'ok',
        severity: 'info',
      },
      {
        check: PreflightCheck.FEE_ESTIMATE,
        status: 'PASS',
        message: 'ok',
        severity: 'info',
      },
    ];

    const map = runner.getChecksMap(results);
    expect(map[PreflightCheck.EXEC_SUCCESS]).toBe('PASS');
    expect(map[PreflightCheck.FEE_ESTIMATE]).toBe('PASS');
  });

  it('should accept custom options', () => {
    const runner = new CheckRunner({
      requiredSigners: ['GAAA…aaaa'],
      expectedMinFee: 50,
      expectedMaxFee: 10000,
    });
    expect(runner).toBeInstanceOf(CheckRunner);
  });

  it('runAllSimulationChecks convenience function', async () => {
    const { runAllSimulationChecks, runAllDeployChecks } = await import('../CheckRunner');
    const simResults = runAllSimulationChecks(makeSimResult());
    expect(simResults.length).toBeGreaterThan(0);

    const deployResults = runAllDeployChecks(makeDeployResult());
    expect(deployResults).toHaveLength(4);
  });
});
