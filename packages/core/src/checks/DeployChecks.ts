import { PreflightCheck, CheckResult, DeployResult } from '../types';
import { BUDGET_LIMITS } from '../constants';
import { createHash } from 'crypto';

export interface DeployChecksInput {
  result: DeployResult;
  expectedWasmHash?: string;
  maxContractSize?: number;
}

export function runDeployChecks(input: DeployChecksInput): CheckResult[] {
  const {
    result,
    expectedWasmHash,
    maxContractSize = BUDGET_LIMITS.maxContractSize,
  } = input;

  const results: CheckResult[] = [];

  results.push(checkWasmValid(result));
  results.push(checkDeploySize(result, maxContractSize));
  results.push(checkUpgradeSafe(result));
  results.push(checkDeployHash(result, expectedWasmHash));

  return results;
}

function checkWasmValid(result: DeployResult): CheckResult {
  if (result.status === 'ERROR') {
    return {
      check: PreflightCheck.DEPLOY_WASM_VALID,
      status: 'FAIL',
      message: result.error?.message || 'WASM binary validation failed due to a simulation error',
      severity: 'error',
    };
  }

  if (!result.wasmHash) {
    return {
      check: PreflightCheck.DEPLOY_WASM_VALID,
      status: 'FAIL',
      message: 'No WASM hash returned — the binary may be invalid or empty',
      severity: 'error',
    };
  }

  const raw = result.error?.diagnostic;
  if (raw && raw.toLowerCase().includes('invalid wasm')) {
    return {
      check: PreflightCheck.DEPLOY_WASM_VALID,
      status: 'FAIL',
      message: 'WASM binary is invalid: ' + raw,
      severity: 'error',
    };
  }

  return {
    check: PreflightCheck.DEPLOY_WASM_VALID,
    status: 'PASS',
    message: `WASM binary is valid (hash: ${result.wasmHash})`,
    severity: 'info',
  };
}

function checkDeploySize(result: DeployResult, maxContractSize: number): CheckResult {
  if (result.status === 'ERROR') {
    return {
      check: PreflightCheck.DEPLOY_SIZE,
      status: 'SKIP',
      message: 'Cannot evaluate deploy size — deployment simulation failed',
      severity: 'info',
    };
  }

  const raw = result.error?.diagnostic;
  if (raw) {
    const sizeMatch = raw.match(/size[=:]\s*(\d+)/i);
    if (sizeMatch) {
      const size = parseInt(sizeMatch[1], 10);
      if (size > maxContractSize) {
        return {
          check: PreflightCheck.DEPLOY_SIZE,
          status: 'FAIL',
          message: `Contract size ${size} bytes exceeds maximum of ${maxContractSize} bytes (${(size / 1024).toFixed(1)} KB / ${(maxContractSize / 1024).toFixed(1)} KB)`,
          severity: 'error',
        };
      }

      if (size > maxContractSize * 0.9) {
        return {
          check: PreflightCheck.DEPLOY_SIZE,
          status: 'WARN',
          message: `Contract size ${size} bytes is approaching the ${maxContractSize} byte limit (${(size / 1024).toFixed(1)} KB)`,
          severity: 'warn',
        };
      }

      return {
        check: PreflightCheck.DEPLOY_SIZE,
        status: 'PASS',
        message: `Contract size ${size} bytes is within the ${maxContractSize} byte limit`,
        severity: 'info',
      };
    }
  }

  if (result.status === 'SUCCESS') {
    return {
      check: PreflightCheck.DEPLOY_SIZE,
      status: 'PASS',
      message: `Contract deployed successfully within the ${maxContractSize} byte limit`,
      severity: 'info',
    };
  }

  return {
    check: PreflightCheck.DEPLOY_SIZE,
    status: 'SKIP',
    message: 'Cannot determine contract size from simulation result',
    severity: 'info',
  };
}

function checkUpgradeSafe(result: DeployResult): CheckResult {
  if (result.status === 'ERROR') {
    return {
      check: PreflightCheck.DEPLOY_UPGRADE_SAFE,
      status: 'SKIP',
      message: 'Cannot evaluate upgrade safety — deployment simulation failed',
      severity: 'info',
    };
  }

  const raw = result.error?.diagnostic;
  if (raw) {
    if (raw.toLowerCase().includes('schema') || raw.toLowerCase().includes('storage mismatch')) {
      return {
        check: PreflightCheck.DEPLOY_UPGRADE_SAFE,
        status: 'FAIL',
        message: 'Storage schema mismatch detected: ' + raw,
        severity: 'error',
      };
    }
  }

  return {
    check: PreflightCheck.DEPLOY_UPGRADE_SAFE,
    status: 'PASS',
    message: 'No storage schema conflicts detected for deployment',
    severity: 'info',
  };
}

function checkDeployHash(result: DeployResult, expectedWasmHash?: string): CheckResult {
  if (result.status === 'ERROR') {
    return {
      check: PreflightCheck.DEPLOY_HASH,
      status: 'SKIP',
      message: 'Cannot verify deploy hash — deployment simulation failed',
      severity: 'info',
    };
  }

  if (!expectedWasmHash) {
    return {
      check: PreflightCheck.DEPLOY_HASH,
      status: 'SKIP',
      message: 'No expected WASM hash provided for verification',
      severity: 'info',
    };
  }

  if (!result.wasmHash) {
    return {
      check: PreflightCheck.DEPLOY_HASH,
      status: 'FAIL',
      message: 'No WASM hash returned from simulation to compare against expected hash',
      severity: 'error',
    };
  }

  if (result.wasmHash !== expectedWasmHash) {
    return {
      check: PreflightCheck.DEPLOY_HASH,
      status: 'FAIL',
      message: `WASM hash mismatch: expected ${expectedWasmHash}, got ${result.wasmHash}`,
      severity: 'error',
    };
  }

  return {
    check: PreflightCheck.DEPLOY_HASH,
    status: 'PASS',
    message: `WASM hash matches expected value: ${result.wasmHash}`,
    severity: 'info',
  };
}
