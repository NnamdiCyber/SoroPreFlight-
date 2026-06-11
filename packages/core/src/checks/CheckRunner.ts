import {
  PreflightCheck,
  CheckResult,
  CheckStatus,
  SimulationResult,
  DeployResult,
} from '../types';
import { runExecChecks, ExecChecksInput } from './ExecChecks';
import { runFeeChecks, FeeChecksInput } from './FeeChecks';
import { runAuthChecks, AuthChecksInput } from './AuthChecks';
import { runStateChecks, StateChecksInput } from './StateChecks';
import { runDeployChecks, DeployChecksInput } from './DeployChecks';

export interface CheckRunnerOptions {
  requiredSigners?: string[];
  expectedMinFee?: number;
  expectedMaxFee?: number;
  expectedWasmHash?: string;
}

export class CheckRunner {
  private readonly options: CheckRunnerOptions;

  constructor(options: CheckRunnerOptions = {}) {
    this.options = options;
  }

  runSimulationChecks(
    result: SimulationResult,
    batchResults?: SimulationResult[],
  ): CheckResult[] {
    const allResults: CheckResult[] = [];

    allResults.push(...runExecChecks({ result } as ExecChecksInput));

    allResults.push(...runFeeChecks({
      result,
      expectedMinFee: this.options.expectedMinFee,
      expectedMaxFee: this.options.expectedMaxFee,
    } as FeeChecksInput));

    allResults.push(...runAuthChecks({
      result,
      requiredSigners: this.options.requiredSigners,
    } as AuthChecksInput));

    allResults.push(...runStateChecks({
      result,
      batchResults,
    } as StateChecksInput));

    return allResults;
  }

  runDeployChecks(result: DeployResult): CheckResult[] {
    return runDeployChecks({
      result,
      expectedWasmHash: this.options.expectedWasmHash,
    } as DeployChecksInput);
  }

  getSummary(results: CheckResult[]): {
    total: number;
    passed: number;
    failed: number;
    warned: number;
    skipped: number;
    status: 'PASS' | 'FAIL' | 'WARN';
  } {
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warned = results.filter(r => r.status === 'WARN').length;
    const skipped = results.filter(r => r.status === 'SKIP').length;

    let status: 'PASS' | 'FAIL' | 'WARN';
    if (failed > 0) {
      status = 'FAIL';
    } else if (warned > 0) {
      status = 'WARN';
    } else {
      status = 'PASS';
    }

    return {
      total: results.length,
      passed,
      failed,
      warned,
      skipped,
      status,
    };
  }

  getChecksMap(results: CheckResult[]): Record<string, CheckStatus> {
    const map: Record<string, CheckStatus> = {};
    for (const r of results) {
      map[r.check] = r.status;
    }
    return map;
  }
}

export function runAllSimulationChecks(
  result: SimulationResult,
  batchResults?: SimulationResult[],
): CheckResult[] {
  const runner = new CheckRunner();
  return runner.runSimulationChecks(result, batchResults);
}

export function runAllDeployChecks(result: DeployResult): CheckResult[] {
  const runner = new CheckRunner();
  return runner.runDeployChecks(result);
}
