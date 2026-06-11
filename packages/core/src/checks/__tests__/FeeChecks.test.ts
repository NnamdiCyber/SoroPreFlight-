import { describe, it, expect } from 'vitest';
import { runFeeChecks } from '../FeeChecks';
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
      instructions: 100000,
      maxInstructions: BUDGET_LIMITS.maxInstructions,
      readBytes: 1024,
      writeBytes: 512,
    },
    auth: [],
    checks: {},
    checkResults: [],
    raw: null,
    timestamp: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('FeeChecks', () => {
  describe('FEE_ESTIMATE', () => {
    it('should PASS when fee estimate is valid', () => {
      const result = makeSuccessResult();
      const checks = runFeeChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.FEE_ESTIMATE)!;
      expect(check.status).toBe('PASS');
    });

    it('should WARN when min fee is below expected', () => {
      const result = makeSuccessResult();
      const checks = runFeeChecks({ result, expectedMinFee: 500 });
      const check = checks.find(c => c.check === PreflightCheck.FEE_ESTIMATE)!;
      expect(check.status).toBe('WARN');
    });

    it('should WARN when max fee exceeds expected', () => {
      const result = makeSuccessResult();
      const checks = runFeeChecks({ result, expectedMaxFee: 1000 });
      const check = checks.find(c => c.check === PreflightCheck.FEE_ESTIMATE)!;
      expect(check.status).toBe('WARN');
    });

    it('should SKIP when simulation did not succeed', () => {
      const result = makeSuccessResult({ status: 'FAIL', error: { code: 'ERR', message: 'err' } });
      const checks = runFeeChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.FEE_ESTIMATE)!;
      expect(check.status).toBe('SKIP');
    });

    it('should WARN when recommended < min', () => {
      const result = makeSuccessResult({
        fee: { ...makeSuccessResult().fee, minFee: 500, recommendedFee: 300 },
      });
      const checks = runFeeChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.FEE_ESTIMATE)!;
      expect(check.status).toBe('WARN');
    });
  });

  describe('FEE_SURPLUS', () => {
    it('should PASS when surplus is healthy', () => {
      const result = makeSuccessResult();
      const checks = runFeeChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.FEE_SURPLUS)!;
      expect(check.status).toBe('PASS');
    });

    it('should FAIL when surplus is below minimum', () => {
      const result = makeSuccessResult({
        fee: { ...makeSuccessResult().fee, feeSurplusPercent: 5 },
      });
      const checks = runFeeChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.FEE_SURPLUS)!;
      expect(check.status).toBe('FAIL');
    });

    it('should WARN when surplus is adequate but tight', () => {
      const result = makeSuccessResult({
        fee: { ...makeSuccessResult().fee, feeSurplusPercent: 22 },
      });
      const checks = runFeeChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.FEE_SURPLUS)!;
      expect(check.status).toBe('WARN');
    });

    it('should SKIP when simulation did not succeed', () => {
      const result = makeSuccessResult({ status: 'ERROR', error: { code: 'ERR', message: 'err' } });
      const checks = runFeeChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.FEE_SURPLUS)!;
      expect(check.status).toBe('SKIP');
    });
  });

  it('should return all 2 fee checks', () => {
    const result = makeSuccessResult();
    const checks = runFeeChecks({ result });
    expect(checks).toHaveLength(2);
    expect(checks.map(c => c.check)).toEqual([
      PreflightCheck.FEE_ESTIMATE,
      PreflightCheck.FEE_SURPLUS,
    ]);
  });
});
