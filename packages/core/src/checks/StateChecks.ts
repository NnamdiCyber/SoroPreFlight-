import { PreflightCheck, CheckResult, SimulationResult } from '../types';
import { BUDGET_LIMITS } from '../constants';

export interface StateChecksInput {
  result: SimulationResult;
  batchResults?: SimulationResult[];
  expiryWarningDays?: number;
}

export function runStateChecks(input: StateChecksInput): CheckResult[] {
  const {
    result,
    batchResults,
    expiryWarningDays = BUDGET_LIMITS.expiryWarningDays,
  } = input;

  const results: CheckResult[] = [];

  results.push(checkStateFootprint(result));
  results.push(checkStateExpiry(result, expiryWarningDays));
  results.push(checkStateCollision(result, batchResults));

  return results;
}

function checkStateFootprint(result: SimulationResult): CheckResult {
  if (result.status !== 'SUCCESS') {
    return {
      check: PreflightCheck.STATE_FOOTPRINT,
      status: 'SKIP',
      message: 'Cannot evaluate state footprint — simulation did not complete successfully',
      severity: 'info',
    };
  }

  const readBytes = result.fee.readBytes;
  const writeBytes = result.fee.writeBytes;

  if (readBytes > BUDGET_LIMITS.maxReadBytes) {
    return {
      check: PreflightCheck.STATE_FOOTPRINT,
      status: 'FAIL',
      message: `Ledger read footprint exceeds limit: ${readBytes} bytes (max: ${BUDGET_LIMITS.maxReadBytes} bytes)`,
      severity: 'error',
    };
  }

  if (writeBytes > BUDGET_LIMITS.maxWriteBytes) {
    return {
      check: PreflightCheck.STATE_FOOTPRINT,
      status: 'FAIL',
      message: `Ledger write footprint exceeds limit: ${writeBytes} bytes (max: ${BUDGET_LIMITS.maxWriteBytes} bytes)`,
      severity: 'error',
    };
  }

  const readWarnThreshold = Math.floor(BUDGET_LIMITS.maxReadBytes * 0.85);
  const writeWarnThreshold = Math.floor(BUDGET_LIMITS.maxWriteBytes * 0.85);
  const warnings: string[] = [];

  if (readBytes > readWarnThreshold) {
    warnings.push(`read footprint ${readBytes} bytes is approaching the ${BUDGET_LIMITS.maxReadBytes} byte limit`);
  }
  if (writeBytes > writeWarnThreshold) {
    warnings.push(`write footprint ${writeBytes} bytes is approaching the ${BUDGET_LIMITS.maxWriteBytes} byte limit`);
  }

  if (warnings.length > 0) {
    return {
      check: PreflightCheck.STATE_FOOTPRINT,
      status: 'WARN',
      message: `State footprint concerns: ${warnings.join('; ')}`,
      severity: 'warn',
    };
  }

  return {
    check: PreflightCheck.STATE_FOOTPRINT,
    status: 'PASS',
    message: `Ledger state footprint is valid: ${readBytes} bytes read, ${writeBytes} bytes written`,
    severity: 'info',
  };
}

function checkStateExpiry(result: SimulationResult, expiryWarningDays: number): CheckResult {
  if (result.status !== 'SUCCESS') {
    return {
      check: PreflightCheck.STATE_EXPIRY,
      status: 'SKIP',
      message: 'Cannot evaluate state expiry — simulation did not complete successfully',
      severity: 'info',
    };
  }

  const raw = result.raw as Record<string, unknown> | null;
  const stateChanges = raw?.['stateChanges'] as Array<Record<string, unknown>> | undefined;

  if (!stateChanges || stateChanges.length === 0) {
    return {
      check: PreflightCheck.STATE_EXPIRY,
      status: 'SKIP',
      message: 'No state changes in simulation result to evaluate expiry',
      severity: 'info',
    };
  }

  const nearExpiry: string[] = [];
  const expired: string[] = [];

  for (const change of stateChanges) {
    const key = change['key'] as string | undefined;
    const ttl = change['ttl'] as number | undefined;

    if (ttl !== undefined && key) {
      if (ttl <= 0) {
        expired.push(key);
      } else if (ttl < expiryWarningDays * 24 * 60) {
        nearExpiry.push(`${key} (TTL: ${ttl} ledgers)`);
      }
    }
  }

  if (expired.length > 0) {
    return {
      check: PreflightCheck.STATE_EXPIRY,
      status: 'FAIL',
      message: `Some ledger entries have expired: ${expired.join(', ')}`,
      severity: 'error',
    };
  }

  if (nearExpiry.length > 0) {
    return {
      check: PreflightCheck.STATE_EXPIRY,
      status: 'WARN',
      message: `${nearExpiry.length} ledger entr${nearExpiry.length === 1 ? 'y is' : 'ies are'} near expiry (within ${expiryWarningDays} days): ${nearExpiry.join('; ')}`,
      severity: 'warn',
    };
  }

  return {
    check: PreflightCheck.STATE_EXPIRY,
    status: 'PASS',
    message: `All ${stateChanges.length} state entr${stateChanges.length === 1 ? 'y has' : 'ies have'} adequate TTL`,
    severity: 'info',
  };
}

function checkStateCollision(result: SimulationResult, batchResults?: SimulationResult[]): CheckResult {
  if (result.status !== 'SUCCESS') {
    return {
      check: PreflightCheck.STATE_COLLISION,
      status: 'SKIP',
      message: 'Cannot evaluate state collisions — simulation did not complete successfully',
      severity: 'info',
    };
  }

  const targets = batchResults ?? [result];

  if (targets.length < 2) {
    return {
      check: PreflightCheck.STATE_COLLISION,
      status: 'SKIP',
      message: 'State collision detection requires at least 2 operations (use batch mode)',
      severity: 'info',
    };
  }

  const writeSets: { index: number; contractId: string; method: string; writeKeys: string[] }[] = [];

  for (let i = 0; i < targets.length; i++) {
    const r = targets[i];
    const raw = r.raw as Record<string, unknown> | null;
    const stateChanges = raw?.['stateChanges'] as Array<Record<string, unknown>> | undefined;

    if (!stateChanges) continue;

    const writeKeys: string[] = [];
    for (const change of stateChanges) {
      const type = change['type'] as string | undefined;
      const key = change['key'] as string | undefined;
      if ((type === 'written' || type === 'created') && key) {
        writeKeys.push(key);
      }
    }

    if (writeKeys.length > 0) {
      writeSets.push({
        index: i,
        contractId: r.contractId,
        method: r.method,
        writeKeys,
      });
    }
  }

  const collisions: string[] = [];

  for (let i = 0; i < writeSets.length; i++) {
    for (let j = i + 1; j < writeSets.length; j++) {
      const shared = writeSets[i].writeKeys.filter(k =>
        writeSets[j].writeKeys.includes(k),
      );
      for (const key of shared) {
        collisions.push(
          `Write conflict on key "${key}" between operation #${writeSets[i].index} (${writeSets[i].contractId}.${writeSets[i].method}) and #${writeSets[j].index} (${writeSets[j].contractId}.${writeSets[j].method})`,
        );
      }
    }
  }

  if (collisions.length > 0) {
    return {
      check: PreflightCheck.STATE_COLLISION,
      status: 'FAIL',
      message: `${collisions.length} state collision${collisions.length === 1 ? '' : 's'} detected: ${collisions.join('; ')}`,
      severity: 'error',
    };
  }

  return {
    check: PreflightCheck.STATE_COLLISION,
    status: 'PASS',
    message: `No state collisions detected across ${targets.length} operation${targets.length === 1 ? '' : 's'}`,
    severity: 'info',
  };
}
