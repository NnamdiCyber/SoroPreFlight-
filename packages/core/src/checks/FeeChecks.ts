import { PreflightCheck, CheckResult, SimulationResult, FeeEstimate } from '../types';
import { BUDGET_LIMITS } from '../constants';

export interface FeeChecksInput {
  result: SimulationResult;
  expectedMinFee?: number;
  expectedMaxFee?: number;
  minSurplusPercent?: number;
}

export function runFeeChecks(input: FeeChecksInput): CheckResult[] {
  const {
    result,
    expectedMinFee,
    expectedMaxFee,
    minSurplusPercent = BUDGET_LIMITS.feeSurplusMinimum * 100,
  } = input;

  const results: CheckResult[] = [];

  results.push(checkFeeEstimate(result, expectedMinFee, expectedMaxFee));
  results.push(checkFeeSurplus(result, minSurplusPercent));

  return results;
}

function checkFeeEstimate(
  result: SimulationResult,
  expectedMinFee?: number,
  expectedMaxFee?: number,
): CheckResult {
  if (result.status !== 'SUCCESS') {
    return {
      check: PreflightCheck.FEE_ESTIMATE,
      status: 'SKIP',
      message: 'Cannot evaluate fee estimate — simulation did not complete successfully',
      severity: 'info',
    };
  }

  const fee = result.fee;
  const issues: string[] = [];

  if (expectedMinFee !== undefined && fee.minFee < expectedMinFee) {
    issues.push(`min fee (${fee.minFee}) is below expected minimum (${expectedMinFee})`);
  }

  if (expectedMaxFee !== undefined && fee.maxFee > expectedMaxFee) {
    issues.push(`max fee (${fee.maxFee}) exceeds expected maximum (${expectedMaxFee})`);
  }

  if (fee.recommendedFee < fee.minFee) {
    issues.push(`recommended fee (${fee.recommendedFee}) is less than minimum fee (${fee.minFee})`);
  }

  if (fee.recommendedFee > fee.maxFee) {
    issues.push(`recommended fee (${fee.recommendedFee}) exceeds max fee (${fee.maxFee})`);
  }

  if (fee.instructions > BUDGET_LIMITS.maxInstructions) {
    issues.push(`instructions (${fee.instructions}) exceed maximum (${BUDGET_LIMITS.maxInstructions})`);
  }

  if (issues.length > 0) {
    return {
      check: PreflightCheck.FEE_ESTIMATE,
      status: 'WARN',
      message: `Fee estimate has anomalies: ${issues.join('; ')}`,
      severity: 'warn',
    };
  }

  return {
    check: PreflightCheck.FEE_ESTIMATE,
    status: 'PASS',
    message: `Fee estimate is valid: min=${fee.minFee}, recommended=${fee.recommendedFee}, max=${fee.maxFee}`,
    severity: 'info',
  };
}

function checkFeeSurplus(result: SimulationResult, minSurplusPercent: number): CheckResult {
  if (result.status !== 'SUCCESS') {
    return {
      check: PreflightCheck.FEE_SURPLUS,
      status: 'SKIP',
      message: 'Cannot evaluate fee surplus — simulation did not complete successfully',
      severity: 'info',
    };
  }

  const surplusPercent = result.fee.feeSurplusPercent;

  if (surplusPercent < minSurplusPercent) {
    return {
      check: PreflightCheck.FEE_SURPLUS,
      status: 'FAIL',
      message: `Fee surplus is insufficient: ${surplusPercent.toFixed(1)}% (minimum required: ${minSurplusPercent}%)`,
      severity: 'error',
    };
  }

  if (surplusPercent < minSurplusPercent * 1.5) {
    return {
      check: PreflightCheck.FEE_SURPLUS,
      status: 'WARN',
      message: `Fee surplus is adequate but tight: ${surplusPercent.toFixed(1)}% (minimum: ${minSurplusPercent}%)`,
      severity: 'warn',
    };
  }

  return {
    check: PreflightCheck.FEE_SURPLUS,
    status: 'PASS',
    message: `Fee surplus is healthy: ${surplusPercent.toFixed(1)}% (minimum required: ${minSurplusPercent}%)`,
    severity: 'info',
  };
}
