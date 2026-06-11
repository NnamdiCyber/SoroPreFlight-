import { describe, it, expect } from 'vitest';
import { runDeployChecks } from '../DeployChecks';
import { PreflightCheck, DeployResult } from '../../types';

function makeSuccessResult(overrides: Partial<DeployResult> = {}): DeployResult {
  return {
    status: 'SUCCESS',
    contractId: 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE',
    wasmHash: 'abc123def456',
    checks: {},
    checkResults: [],
    ...overrides,
  };
}

describe('DeployChecks', () => {
  describe('DEPLOY_WASM_VALID', () => {
    it('should PASS when WASM is valid', () => {
      const result = makeSuccessResult();
      const checks = runDeployChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.DEPLOY_WASM_VALID)!;
      expect(check.status).toBe('PASS');
    });

    it('should FAIL when no wasm hash', () => {
      const result = makeSuccessResult({ wasmHash: '' });
      const checks = runDeployChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.DEPLOY_WASM_VALID)!;
      expect(check.status).toBe('FAIL');
    });

    it('should FAIL when error indicates invalid WASM', () => {
      const result = makeSuccessResult({
        status: 'FAIL',
        error: { code: 'WASM_ERROR', message: 'Invalid WASM', diagnostic: 'invalid wasm: bad magic number' },
        wasmHash: '',
      });
      const checks = runDeployChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.DEPLOY_WASM_VALID)!;
      expect(check.status).toBe('FAIL');
    });

    it('should FAIL on ERROR status', () => {
      const result = makeSuccessResult({
        status: 'ERROR',
        error: { code: 'NETWORK_ERROR', message: 'connection failed' },
        wasmHash: '',
      });
      const checks = runDeployChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.DEPLOY_WASM_VALID)!;
      expect(check.status).toBe('FAIL');
    });
  });

  describe('DEPLOY_SIZE', () => {
    it('should PASS when size is within limits', () => {
      const result = makeSuccessResult();
      const checks = runDeployChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.DEPLOY_SIZE)!;
      expect(check.status).toBe('PASS');
    });

    it('should FAIL when size exceeds limit', () => {
      const result = makeSuccessResult({
        error: { code: 'SIZE_ERROR', message: 'Contract too large', diagnostic: 'size=150000' },
      });
      const checks = runDeployChecks({ result, maxContractSize: 100000 });
      const check = checks.find(c => c.check === PreflightCheck.DEPLOY_SIZE)!;
      expect(check.status).toBe('FAIL');
    });

    it('should WARN when size approaches limit', () => {
      const result = makeSuccessResult({
        error: { code: 'SIZE_ERROR', message: 'Contract large', diagnostic: 'size=95000' },
      });
      const checks = runDeployChecks({ result, maxContractSize: 100000 });
      const check = checks.find(c => c.check === PreflightCheck.DEPLOY_SIZE)!;
      expect(check.status).toBe('WARN');
    });

    it('should SKIP on ERROR status', () => {
      const result = makeSuccessResult({
        status: 'ERROR',
        error: { code: 'NETWORK_ERROR', message: 'failed' },
        wasmHash: '',
      });
      const checks = runDeployChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.DEPLOY_SIZE)!;
      expect(check.status).toBe('SKIP');
    });
  });

  describe('DEPLOY_UPGRADE_SAFE', () => {
    it('should PASS when no schema conflicts', () => {
      const result = makeSuccessResult();
      const checks = runDeployChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.DEPLOY_UPGRADE_SAFE)!;
      expect(check.status).toBe('PASS');
    });

    it('should FAIL when storage mismatch detected', () => {
      const result = makeSuccessResult({
        error: { code: 'MISMATCH', message: 'Schema conflict', diagnostic: 'storage mismatch detected' },
      });
      const checks = runDeployChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.DEPLOY_UPGRADE_SAFE)!;
      expect(check.status).toBe('FAIL');
    });

    it('should SKIP on ERROR status', () => {
      const result = makeSuccessResult({
        status: 'ERROR',
        error: { code: 'ERR', message: 'failed' },
        wasmHash: '',
      });
      const checks = runDeployChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.DEPLOY_UPGRADE_SAFE)!;
      expect(check.status).toBe('SKIP');
    });
  });

  describe('DEPLOY_HASH', () => {
    it('should PASS when hash matches', () => {
      const result = makeSuccessResult();
      const checks = runDeployChecks({ result, expectedWasmHash: 'abc123def456' });
      const check = checks.find(c => c.check === PreflightCheck.DEPLOY_HASH)!;
      expect(check.status).toBe('PASS');
    });

    it('should FAIL when hash does not match', () => {
      const result = makeSuccessResult();
      const checks = runDeployChecks({ result, expectedWasmHash: 'different-hash' });
      const check = checks.find(c => c.check === PreflightCheck.DEPLOY_HASH)!;
      expect(check.status).toBe('FAIL');
    });

    it('should SKIP when no expected hash provided', () => {
      const result = makeSuccessResult();
      const checks = runDeployChecks({ result });
      const check = checks.find(c => c.check === PreflightCheck.DEPLOY_HASH)!;
      expect(check.status).toBe('SKIP');
    });

    it('should FAIL when no wasm hash in result', () => {
      const result = makeSuccessResult({ wasmHash: '' });
      const checks = runDeployChecks({ result, expectedWasmHash: 'abc123' });
      const check = checks.find(c => c.check === PreflightCheck.DEPLOY_HASH)!;
      expect(check.status).toBe('FAIL');
    });

    it('should SKIP on ERROR status', () => {
      const result = makeSuccessResult({
        status: 'ERROR',
        error: { code: 'ERR', message: 'failed' },
        wasmHash: '',
      });
      const checks = runDeployChecks({ result, expectedWasmHash: 'abc123' });
      const check = checks.find(c => c.check === PreflightCheck.DEPLOY_HASH)!;
      expect(check.status).toBe('SKIP');
    });
  });

  it('should return all 4 deploy checks', () => {
    const result = makeSuccessResult();
    const checks = runDeployChecks({ result });
    expect(checks).toHaveLength(4);
    expect(checks.map(c => c.check)).toEqual([
      PreflightCheck.DEPLOY_WASM_VALID,
      PreflightCheck.DEPLOY_SIZE,
      PreflightCheck.DEPLOY_UPGRADE_SAFE,
      PreflightCheck.DEPLOY_HASH,
    ]);
  });
});
