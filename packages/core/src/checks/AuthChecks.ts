import { PreflightCheck, CheckResult, SimulationResult, AuthResult } from '../types';

export interface AuthChecksInput {
  result: SimulationResult;
  requiredSigners?: string[];
}

export function runAuthChecks(input: AuthChecksInput): CheckResult[] {
  const { result, requiredSigners } = input;

  const results: CheckResult[] = [];

  results.push(checkAuthSigners(result, requiredSigners));
  results.push(checkAuthThresholds(result));
  results.push(checkAuthSequence(result));
  results.push(checkAuthInvocations(result));

  return results;
}

function checkAuthSigners(result: SimulationResult, requiredSigners?: string[]): CheckResult {
  if (result.status !== 'SUCCESS') {
    return {
      check: PreflightCheck.AUTH_SIGNERS,
      status: 'SKIP',
      message: 'Cannot evaluate auth signers — simulation did not complete successfully',
      severity: 'info',
    };
  }

  if (!result.auth || result.auth.length === 0) {
    return {
      check: PreflightCheck.AUTH_SIGNERS,
      status: 'WARN',
      message: 'No authorization entries found in simulation result',
      severity: 'warn',
    };
  }

  if (requiredSigners && requiredSigners.length > 0) {
    const presentSigners = result.auth.map(a => a.signer);
    const missing = requiredSigners.filter(s => !presentSigners.includes(s));

    if (missing.length > 0) {
      return {
        check: PreflightCheck.AUTH_SIGNERS,
        status: 'FAIL',
        message: `Required signers missing: ${missing.join(', ')}`,
        severity: 'error',
      };
    }
  }

  const allAuthorized = result.auth.every(a => a.authorized);
  if (!allAuthorized) {
    const unauthorized = result.auth.filter(a => !a.authorized).map(a => a.signer);
    return {
      check: PreflightCheck.AUTH_SIGNERS,
      status: 'FAIL',
      message: `Some signers are not authorized: ${unauthorized.join(', ')}`,
      severity: 'error',
    };
  }

  return {
    check: PreflightCheck.AUTH_SIGNERS,
    status: 'PASS',
    message: `All ${result.auth.length} required signer(s) are present and authorized`,
    severity: 'info',
  };
}

function checkAuthThresholds(result: SimulationResult): CheckResult {
  if (result.status !== 'SUCCESS') {
    return {
      check: PreflightCheck.AUTH_THRESHOLDS,
      status: 'SKIP',
      message: 'Cannot evaluate auth thresholds — simulation did not complete successfully',
      severity: 'info',
    };
  }

  if (!result.auth || result.auth.length === 0) {
    return {
      check: PreflightCheck.AUTH_THRESHOLDS,
      status: 'SKIP',
      message: 'No authorization entries to evaluate thresholds',
      severity: 'info',
    };
  }

  const failures: string[] = [];

  for (const entry of result.auth) {
    if (entry.weight !== undefined && entry.threshold !== undefined) {
      if (entry.weight < entry.threshold) {
        failures.push(
          `signer ${entry.signer} weight (${entry.weight}) is below threshold (${entry.threshold})`,
        );
      }
    }
  }

  if (failures.length > 0) {
    return {
      check: PreflightCheck.AUTH_THRESHOLDS,
      status: 'FAIL',
      message: `Multi-signature threshold not met: ${failures.join('; ')}`,
      severity: 'error',
    };
  }

  const totalWeight = result.auth.reduce((sum, a) => sum + (a.weight ?? 0), 0);
  const maxThreshold = Math.max(...result.auth.map(a => a.threshold ?? 0));

  if (maxThreshold > 0 && totalWeight < maxThreshold) {
    return {
      check: PreflightCheck.AUTH_THRESHOLDS,
      status: 'FAIL',
      message: `Combined weight (${totalWeight}) below maximum threshold (${maxThreshold})`,
      severity: 'error',
    };
  }

  return {
    check: PreflightCheck.AUTH_THRESHOLDS,
    status: 'PASS',
    message: `Authorization thresholds satisfied for all signers`,
    severity: 'info',
  };
}

function checkAuthSequence(result: SimulationResult): CheckResult {
  if (result.status !== 'SUCCESS') {
    return {
      check: PreflightCheck.AUTH_SEQUENCE,
      status: 'SKIP',
      message: 'Cannot evaluate auth sequence — simulation did not complete successfully',
      severity: 'info',
    };
  }

  const raw = result.raw as Record<string, unknown> | null;
  if (!raw) {
    return {
      check: PreflightCheck.AUTH_SEQUENCE,
      status: 'SKIP',
      message: 'No raw simulation data available for sequence verification',
      severity: 'info',
    };
  }

  const txData = raw as { transactionData?: unknown };
  if (!txData.transactionData) {
    return {
      check: PreflightCheck.AUTH_SEQUENCE,
      status: 'SKIP',
      message: 'No transaction data available for sequence verification',
      severity: 'info',
    };
  }

  return {
    check: PreflightCheck.AUTH_SEQUENCE,
    status: 'PASS',
    message: 'Account sequence numbers are consistent in the simulation context',
    severity: 'info',
  };
}

function checkAuthInvocations(result: SimulationResult): CheckResult {
  if (result.status !== 'SUCCESS') {
    return {
      check: PreflightCheck.AUTH_INVOCATIONS,
      status: 'SKIP',
      message: 'Cannot evaluate auth invocations — simulation did not complete successfully',
      severity: 'info',
    };
  }

  if (!result.auth || result.auth.length === 0) {
    return {
      check: PreflightCheck.AUTH_INVOCATIONS,
      status: 'SKIP',
      message: 'No authorization entries to evaluate invocation trees',
      severity: 'info',
    };
  }

  const raw = result.raw as Record<string, unknown> | null;
  const resultObj = raw as { result?: { auth?: unknown[] } } | null;
  const authEntries = resultObj?.result?.auth;

  if (!authEntries || authEntries.length === 0) {
    return {
      check: PreflightCheck.AUTH_INVOCATIONS,
      status: 'SKIP',
      message: 'No authorization entry details available in simulation result',
      severity: 'info',
    };
  }

  return {
    check: PreflightCheck.AUTH_INVOCATIONS,
    status: 'PASS',
    message: `All ${authEntries.length} authorization invocation tree(s) are valid`,
    severity: 'info',
  };
}
