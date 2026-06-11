import { describe, it, expect } from 'vitest';
import { runAuthChecks } from '../AuthChecks';
import { PreflightCheck, SimulationResult } from '../../types';
import { BUDGET_LIMITS } from '../../constants';

function makeResult(overrides: Partial<SimulationResult> = {}): SimulationResult {
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
      readBytes: 1024,
      writeBytes: 512,
    },
    auth: [
      { signer: 'GAAA…aaaa', authorized: true, weight: 1, threshold: 1 },
      { signer: 'GBBB…bbbb', authorized: true, weight: 2, threshold: 1 },
    ],
    checks: {},
    checkResults: [],
    raw: {
      result: { auth: ['entry1', 'entry2'] },
      transactionData: {},
    },
    timestamp: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('AuthChecks', () => {
  describe('AUTH_SIGNERS', () => {
    it('should PASS when all signers are authorized', () => {
      const result = makeResult();
      const checks = runAuthChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.AUTH_SIGNERS)!;
      expect(check.status).toBe('PASS');
    });

    it('should FAIL when required signers are missing', () => {
      const result = makeResult();
      const checks = runAuthChecks({ result, requiredSigners: ['GCCC…cccc'] });
      const check = checks.find(c => c.check === PreflightCheck.AUTH_SIGNERS)!;
      expect(check.status).toBe('FAIL');
    });

    it('should FAIL when signer is not authorized', () => {
      const result = makeResult({
        auth: [{ signer: 'GAAA…aaaa', authorized: false }],
      });
      const checks = runAuthChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.AUTH_SIGNERS)!;
      expect(check.status).toBe('FAIL');
    });

    it('should WARN when no auth entries exist', () => {
      const result = makeResult({ auth: [] });
      const checks = runAuthChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.AUTH_SIGNERS)!;
      expect(check.status).toBe('WARN');
    });

    it('should SKIP when simulation did not succeed', () => {
      const result = makeResult({ status: 'FAIL', error: { code: 'ERR', message: 'err' } });
      const checks = runAuthChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.AUTH_SIGNERS)!;
      expect(check.status).toBe('SKIP');
    });
  });

  describe('AUTH_THRESHOLDS', () => {
    it('should PASS when thresholds are met', () => {
      const result = makeResult();
      const checks = runAuthChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.AUTH_THRESHOLDS)!;
      expect(check.status).toBe('PASS');
    });

    it('should FAIL when weight is below threshold', () => {
      const result = makeResult({
        auth: [{ signer: 'GAAA…aaaa', authorized: true, weight: 1, threshold: 5 }],
      });
      const checks = runAuthChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.AUTH_THRESHOLDS)!;
      expect(check.status).toBe('FAIL');
    });

    it('should SKIP when no auth entries', () => {
      const result = makeResult({ auth: [] });
      const checks = runAuthChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.AUTH_THRESHOLDS)!;
      expect(check.status).toBe('SKIP');
    });

    it('should SKIP when simulation did not succeed', () => {
      const result = makeResult({ status: 'ERROR', error: { code: 'ERR', message: 'err' } });
      const checks = runAuthChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.AUTH_THRESHOLDS)!;
      expect(check.status).toBe('SKIP');
    });
  });

  describe('AUTH_SEQUENCE', () => {
    it('should PASS when transaction data exists', () => {
      const result = makeResult();
      const checks = runAuthChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.AUTH_SEQUENCE)!;
      expect(check.status).toBe('PASS');
    });

    it('should SKIP when no transaction data', () => {
      const result = makeResult({ raw: null });
      const checks = runAuthChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.AUTH_SEQUENCE)!;
      expect(check.status).toBe('SKIP');
    });

    it('should SKIP when simulation did not succeed', () => {
      const result = makeResult({ status: 'FAIL', error: { code: 'ERR', message: 'err' } });
      const checks = runAuthChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.AUTH_SEQUENCE)!;
      expect(check.status).toBe('SKIP');
    });
  });

  describe('AUTH_INVOCATIONS', () => {
    it('should PASS when auth invocation entries exist', () => {
      const result = makeResult();
      const checks = runAuthChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.AUTH_INVOCATIONS)!;
      expect(check.status).toBe('PASS');
    });

    it('should SKIP when no auth entries', () => {
      const result = makeResult({ auth: [] });
      const checks = runAuthChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.AUTH_INVOCATIONS)!;
      expect(check.status).toBe('SKIP');
    });

    it('should SKIP when no raw result auth', () => {
      const result = makeResult({ raw: { result: {} } });
      const checks = runAuthChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.AUTH_INVOCATIONS)!;
      expect(check.status).toBe('SKIP');
    });

    it('should SKIP when simulation did not succeed', () => {
      const result = makeResult({ status: 'FAIL', error: { code: 'ERR', message: 'err' } });
      const checks = runAuthChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.AUTH_INVOCATIONS)!;
      expect(check.status).toBe('SKIP');
    });
  });

  it('should return all 4 auth checks', () => {
    const result = makeResult();
    const checks = runAuthChecks({ result });
    expect(checks).toHaveLength(4);
    expect(checks.map(c => c.check)).toEqual([
      PreflightCheck.AUTH_SIGNERS,
      PreflightCheck.AUTH_THRESHOLDS,
      PreflightCheck.AUTH_SEQUENCE,
      PreflightCheck.AUTH_INVOCATIONS,
    ]);
  });
});
