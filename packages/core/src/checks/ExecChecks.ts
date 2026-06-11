import { PreflightCheck, CheckResult, SimulationResult } from '../types';
import { BUDGET_LIMITS } from '../constants';

export interface ExecChecksInput {
  result: SimulationResult;
  instructionLimit?: number;
  memoryLimit?: number;
  timeoutMs?: number;
}

export function runExecChecks(input: ExecChecksInput): CheckResult[] {
  const {
    result,
    instructionLimit = BUDGET_LIMITS.maxInstructions,
    memoryLimit = BUDGET_LIMITS.memoryLimit,
    timeoutMs = BUDGET_LIMITS.simulationTimeout,
  } = input;

  const results: CheckResult[] = [];

  results.push(checkExecSuccess(result));
  results.push(checkExecBudget(result, instructionLimit));
  results.push(checkExecMemory(result, memoryLimit));
  results.push(checkExecTimeout(result, timeoutMs));

  return results;
}

function checkExecSuccess(result: SimulationResult): CheckResult {
  if (result.status === 'SUCCESS') {
    return {
      check: PreflightCheck.EXEC_SUCCESS,
      status: 'PASS',
      message: 'Contract executed successfully with no errors',
      severity: 'info',
    };
  }

  if (result.status === 'FAIL') {
    return {
      check: PreflightCheck.EXEC_SUCCESS,
      status: 'FAIL',
      message: result.error?.message || 'Contract execution failed with an unknown error',
      severity: 'error',
    };
  }

  return {
    check: PreflightCheck.EXEC_SUCCESS,
    status: 'FAIL',
    message: result.error?.message || 'Simulation encountered an error during execution',
    severity: 'error',
  };
}

function checkExecBudget(result: SimulationResult, instructionLimit: number): CheckResult {
  const instructions = result.fee.instructions;
  const maxInstructions = result.fee.maxInstructions || instructionLimit;
  const threshold = maxInstructions * BUDGET_LIMITS.instructionWarningThreshold;
  const utilizationPercent = maxInstructions > 0 ? (instructions / maxInstructions) * 100 : 0;

  if (instructions === 0 && result.status !== 'SUCCESS') {
    return {
      check: PreflightCheck.EXEC_BUDGET,
      status: 'SKIP',
      message: 'Cannot evaluate instruction budget — simulation did not complete successfully',
      severity: 'info',
    };
  }

  if (instructions > maxInstructions) {
    return {
      check: PreflightCheck.EXEC_BUDGET,
      status: 'FAIL',
      message: `Instruction budget exceeded: ${instructions.toLocaleString()} used, max ${maxInstructions.toLocaleString()} (${utilizationPercent.toFixed(1)}%)`,
      severity: 'error',
    };
  }

  if (instructions > threshold) {
    return {
      check: PreflightCheck.EXEC_BUDGET,
      status: 'WARN',
      message: `Instruction usage is near the limit: ${instructions.toLocaleString()} / ${maxInstructions.toLocaleString()} (${utilizationPercent.toFixed(1)}% — threshold is ${(BUDGET_LIMITS.instructionWarningThreshold * 100)}%)`,
      severity: 'warn',
    };
  }

  return {
    check: PreflightCheck.EXEC_BUDGET,
    status: 'PASS',
    message: `Instruction budget is healthy: ${instructions.toLocaleString()} / ${maxInstructions.toLocaleString()} (${utilizationPercent.toFixed(1)}%)`,
    severity: 'info',
  };
}

function checkExecMemory(result: SimulationResult, memoryLimit: number): CheckResult {
  if (result.status !== 'SUCCESS') {
    return {
      check: PreflightCheck.EXEC_MEMORY,
      status: 'SKIP',
      message: 'Cannot evaluate memory usage — simulation did not complete successfully',
      severity: 'info',
    };
  }

  const memEstimate = estimateMemoryFromResult(result);

  if (memEstimate > memoryLimit) {
    return {
      check: PreflightCheck.EXEC_MEMORY,
      status: 'FAIL',
      message: `Memory usage ${memEstimate} bytes exceeds limit of ${memoryLimit} bytes`,
      severity: 'error',
    };
  }

  const warnThreshold = Math.floor(memoryLimit * 0.85);
  if (memEstimate > warnThreshold) {
    return {
      check: PreflightCheck.EXEC_MEMORY,
      status: 'WARN',
      message: `Memory usage ${memEstimate} bytes is approaching the limit of ${memoryLimit} bytes`,
      severity: 'warn',
    };
  }

  return {
    check: PreflightCheck.EXEC_MEMORY,
    status: 'PASS',
    message: `Memory usage ${memEstimate} bytes is within the ${memoryLimit} byte limit`,
    severity: 'info',
  };
}

function checkExecTimeout(result: SimulationResult, timeoutMs: number): CheckResult {
  if (result.status === 'ERROR' && result.error?.code === 'TIMEOUT') {
    return {
      check: PreflightCheck.EXEC_TIMEOUT,
      status: 'FAIL',
      message: `Simulation timed out after ${timeoutMs}ms`,
      severity: 'error',
    };
  }

  if (result.status !== 'SUCCESS') {
    return {
      check: PreflightCheck.EXEC_TIMEOUT,
      status: 'SKIP',
      message: 'Cannot evaluate execution time — simulation did not complete successfully',
      severity: 'info',
    };
  }

  return {
    check: PreflightCheck.EXEC_TIMEOUT,
    status: 'PASS',
    message: `Execution completed within the ${timeoutMs}ms time limit`,
    severity: 'info',
  };
}

function estimateMemoryFromResult(result: SimulationResult): number {
  try {
    const raw = result.raw as Record<string, unknown> | null;
    if (raw && typeof raw === 'object' && 'cost' in raw) {
      const cost = (raw as { cost?: { memBytes?: string } }).cost;
      if (cost?.memBytes) {
        return parseInt(cost.memBytes, 10);
      }
    }
  } catch {
  }

  const readEstimate = result.fee.readBytes * 2;
  const writeEstimate = result.fee.writeBytes * 4;
  return readEstimate + writeEstimate;
}
