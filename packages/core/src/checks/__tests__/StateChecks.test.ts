import { describe, it, expect } from 'vitest';
import { runStateChecks } from '../StateChecks';
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
      readBytes: 2304,
      writeBytes: 512,
    },
    auth: [],
    checks: {},
    checkResults: [],
    raw: {
      stateChanges: [
        { key: 'entry1', type: 'written', ttl: 50000 },
        { key: 'entry2', type: 'read', ttl: 100000 },
      ],
    },
    timestamp: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('StateChecks', () => {
  describe('STATE_FOOTPRINT', () => {
    it('should PASS when footprint is within limits', () => {
      const result = makeSuccessResult();
      const checks = runStateChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.STATE_FOOTPRINT)!;
      expect(check.status).toBe('PASS');
    });

    it('should FAIL when read bytes exceed limit', () => {
      const result = makeSuccessResult({
        fee: { ...makeSuccessResult().fee, readBytes: BUDGET_LIMITS.maxReadBytes + 1 },
      });
      const checks = runStateChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.STATE_FOOTPRINT)!;
      expect(check.status).toBe('FAIL');
    });

    it('should FAIL when write bytes exceed limit', () => {
      const result = makeSuccessResult({
        fee: { ...makeSuccessResult().fee, writeBytes: BUDGET_LIMITS.maxWriteBytes + 1 },
      });
      const checks = runStateChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.STATE_FOOTPRINT)!;
      expect(check.status).toBe('FAIL');
    });

    it('should WARN when reads approach limit', () => {
      const result = makeSuccessResult({
        fee: {
          ...makeSuccessResult().fee,
          readBytes: Math.floor(BUDGET_LIMITS.maxReadBytes * 0.9),
        },
      });
      const checks = runStateChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.STATE_FOOTPRINT)!;
      expect(check.status).toBe('WARN');
    });

    it('should SKIP when simulation did not succeed', () => {
      const result = makeSuccessResult({ status: 'FAIL', error: { code: 'ERR', message: 'err' } });
      const checks = runStateChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.STATE_FOOTPRINT)!;
      expect(check.status).toBe('SKIP');
    });
  });

  describe('STATE_EXPIRY', () => {
    it('should PASS when all entries have adequate TTL', () => {
      const result = makeSuccessResult();
      const checks = runStateChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.STATE_EXPIRY)!;
      expect(check.status).toBe('PASS');
    });

    it('should WARN when entries are near expiry', () => {
      const result = makeSuccessResult({
        raw: {
          stateChanges: [
            { key: 'entry1', type: 'written', ttl: 10 },
          ],
        },
      });
      const checks = runStateChecks({ result, expiryWarningDays: 1 });
      const check = checks.find(c => c.check === PreflightCheck.STATE_EXPIRY)!;
      expect(check.status).toBe('WARN');
    });

    it('should FAIL when entry is expired', () => {
      const result = makeSuccessResult({
        raw: {
          stateChanges: [
            { key: 'entry1', type: 'written', ttl: 0 },
          ],
        },
      });
      const checks = runStateChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.STATE_EXPIRY)!;
      expect(check.status).toBe('FAIL');
    });

    it('should SKIP when no state changes', () => {
      const result = makeSuccessResult({ raw: {} });
      const checks = runStateChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.STATE_EXPIRY)!;
      expect(check.status).toBe('SKIP');
    });

    it('should SKIP when simulation did not succeed', () => {
      const result = makeSuccessResult({ status: 'ERROR', error: { code: 'ERR', message: 'err' } });
      const checks = runStateChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.STATE_EXPIRY)!;
      expect(check.status).toBe('SKIP');
    });
  });

  describe('STATE_COLLISION', () => {
    it('should PASS with single operation', () => {
      const result = makeSuccessResult();
      const checks = runStateChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.STATE_COLLISION)!;
      expect(check.status).toBe('SKIP');
    });

    it('should PASS when no collisions in batch', () => {
      const result = makeSuccessResult();
      const op2 = makeSuccessResult({
        contractId: 'CB3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE',
        method: 'transfer',
        raw: {
          stateChanges: [
            { key: 'different-key', type: 'written' },
          ],
        },
      });
      const checks = runStateChecks({ result, batchResults: [result, op2] });
      const check = checks.find(c => c.check === PreflightCheck.STATE_COLLISION)!;
      expect(check.status).toBe('PASS');
    });

    it('should FAIL when collision detected in batch', () => {
      const result = makeSuccessResult();
      const op2 = makeSuccessResult({
        contractId: 'CB3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE',
        method: 'transfer',
        raw: {
          stateChanges: [
            { key: 'entry1', type: 'written' },
          ],
        },
      });
      const checks = runStateChecks({ result, batchResults: [result, op2] });
      const check = checks.find(c => c.check === PreflightCheck.STATE_COLLISION)!;
      expect(check.status).toBe('FAIL');
    });

    it('should SKIP when simulation did not succeed', () => {
      const result = makeSuccessResult({ status: 'FAIL', error: { code: 'ERR', message: 'err' } });
      const checks = runStateChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.STATE_COLLISION)!;
      expect(check.status).toBe('SKIP');
    });
  });

  it('should return all 3 state checks', () => {
    const result = makeSuccessResult();
    const checks = runStateChecks({ result });
    expect(checks).toHaveLength(3);
    expect(checks.map(c => c.check)).toEqual([
      PreflightCheck.STATE_FOOTPRINT,
      PreflightCheck.STATE_EXPIRY,
      PreflightCheck.STATE_COLLISION,
    ]);
  });
});
