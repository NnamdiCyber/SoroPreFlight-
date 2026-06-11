import { describe, it, expect } from 'vitest';
import { runExecChecks } from '../ExecChecks';
import { PreflightCheck, SimulationResult } from '../../types';
import { BUDGET_LIMITS } from '../../constants';

function makeSuccessResult(overrides: Partial<SimulationResult> = {}): SimulationResult {
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
      instructions: 142880,
      maxInstructions: BUDGET_LIMITS.maxInstructions,
      readBytes: 2304,
      writeBytes: 512,
    },
    auth: [],
    checks: {},
    checkResults: [],
    raw: {
      cost: { cpuInsns: '142880', memBytes: '4096' },
    },
    timestamp: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ExecChecks', () => {
  describe('EXEC_SUCCESS', () => {
    it('should PASS when execution succeeds', () => {
      const result = makeSuccessResult();
      const checks = runExecChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.EXEC_SUCCESS)!;
      expect(check.status).toBe('PASS');
    });

    it('should FAIL when execution has an error', () => {
      const result = makeSuccessResult({
        status: 'FAIL',
        error: { code: 'CONTRACT_ERROR', message: 'HostError: ContractError(1)' },
      });
      const checks = runExecChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.EXEC_SUCCESS)!;
      expect(check.status).toBe('FAIL');
      expect(check.severity).toBe('error');
    });

    it('should FAIL on ERROR status', () => {
      const result = makeSuccessResult({
        status: 'ERROR',
        error: { code: 'NETWORK_ERROR', message: 'Connection refused' },
      });
      const checks = runExecChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.EXEC_SUCCESS)!;
      expect(check.status).toBe('FAIL');
    });
  });

  describe('EXEC_BUDGET', () => {
    it('should PASS when instructions are well within limits', () => {
      const result = makeSuccessResult();
      const checks = runExecChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.EXEC_BUDGET)!;
      expect(check.status).toBe('PASS');
    });

    it('should WARN when instructions exceed 95% threshold', () => {
      const result = makeSuccessResult({
        fee: {
          ...makeSuccessResult().fee,
          instructions: Math.floor(BUDGET_LIMITS.maxInstructions * 0.96),
        },
      });
      const checks = runExecChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.EXEC_BUDGET)!;
      expect(check.status).toBe('WARN');
    });

    it('should FAIL when instructions exceed max', () => {
      const result = makeSuccessResult({
        fee: {
          ...makeSuccessResult().fee,
          instructions: BUDGET_LIMITS.maxInstructions + 1,
        },
      });
      const checks = runExecChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.EXEC_BUDGET)!;
      expect(check.status).toBe('FAIL');
    });

    it('should SKIP when simulation did not succeed', () => {
      const result = makeSuccessResult({
        status: 'ERROR',
        error: { code: 'TIMEOUT', message: 'Timed out' },
        fee: { ...makeSuccessResult().fee, instructions: 0 },
      });
      const checks = runExecChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.EXEC_BUDGET)!;
      expect(check.status).toBe('SKIP');
    });
  });

  describe('EXEC_MEMORY', () => {
    it('should PASS when memory is within limits', () => {
      const result = makeSuccessResult();
      const checks = runExecChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.EXEC_MEMORY)!;
      expect(check.status).toBe('PASS');
    });

    it('should WARN when memory approaches limit', () => {
      const result = makeSuccessResult({
        raw: { cost: { cpuInsns: '142880', memBytes: String(Math.floor(BUDGET_LIMITS.memoryLimit * 0.9)) } },
      });
      const checks = runExecChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.EXEC_MEMORY)!;
      expect(check.status).toBe('WARN');
    });

    it('should FAIL when memory exceeds limit', () => {
      const result = makeSuccessResult({
        raw: { cost: { cpuInsns: '142880', memBytes: String(BUDGET_LIMITS.memoryLimit + 1) } },
      });
      const checks = runExecChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.EXEC_MEMORY)!;
      expect(check.status).toBe('FAIL');
    });

    it('should SKIP when simulation did not succeed', () => {
      const result = makeSuccessResult({ status: 'FAIL', error: { code: 'ERR', message: 'err' } });
      const checks = runExecChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.EXEC_MEMORY)!;
      expect(check.status).toBe('SKIP');
    });
  });

  describe('EXEC_TIMEOUT', () => {
    it('should PASS when execution completes', () => {
      const result = makeSuccessResult();
      const checks = runExecChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.EXEC_TIMEOUT)!;
      expect(check.status).toBe('PASS');
    });

    it('should FAIL when timeout error', () => {
      const result = makeSuccessResult({
        status: 'ERROR',
        error: { code: 'TIMEOUT', message: 'Simulation timed out after 5000ms' },
      });
      const checks = runExecChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.EXEC_TIMEOUT)!;
      expect(check.status).toBe('FAIL');
    });

    it('should SKIP when non-timeout error', () => {
      const result = makeSuccessResult({
        status: 'ERROR',
        error: { code: 'NETWORK_ERROR', message: 'ECONNREFUSED' },
      });
      const checks = runExecChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.EXEC_TIMEOUT)!;
      expect(check.status).toBe('SKIP');
    });
  });

  it('should return all 4 exec checks', () => {
    const result = makeSuccessResult();
    const checks = runExecChecks({ result });
    expect(checks).toHaveLength(4);
    expect(checks.map(c => c.check)).toEqual([
      PreflightCheck.EXEC_SUCCESS,
      PreflightCheck.EXEC_BUDGET,
      PreflightCheck.EXEC_MEMORY,
      PreflightCheck.EXEC_TIMEOUT,
    ]);
  });
});
