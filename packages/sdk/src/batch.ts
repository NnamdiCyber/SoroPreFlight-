import {
  SimulationEngine,
  CheckRunner,
  AIAnalysisEngine,
  Config,
  SimulationResult,
  BatchResult,
  PreflightCheck,
} from '@soropreflight/core';
import { BatchSimulateOptions } from './types';
import { runSimulation } from './simulate';

export interface RunBatchInput {
  input: BatchSimulateOptions;
  engine: SimulationEngine;
  checkRunner: CheckRunner;
  aiEngine: AIAnalysisEngine;
  config: Config;
}

export async function runBatchSimulation(input: RunBatchInput): Promise<BatchResult> {
  const { input: opts, engine, checkRunner, aiEngine, config } = input;
  const concurrency = opts.concurrency ?? 5;

  const results: SimulationResult[] = [];
  const collisions: string[] = [];

  const queue = [...opts.operations];

  const runNext = async (): Promise<void> => {
    while (queue.length > 0) {
      const operation = queue.shift()!;
      const result = await runSimulation({
        input: operation,
        engine,
        checkRunner,
        aiEngine,
        config,
      });
      results.push(result);
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, opts.operations.length) }, () => runNext());
  await Promise.all(workers);

  const allResults = results;
  for (const r of allResults) {
    const stateCheck = r.checkResults.find(c => c.check === PreflightCheck.STATE_COLLISION);
    if (stateCheck && stateCheck.status === 'FAIL') {
      collisions.push(stateCheck.message);
    }
  }

  const failedCount = results.filter(r => r.status !== 'SUCCESS').length;
  let batchStatus: BatchResult['status'];
  if (failedCount === 0) {
    batchStatus = 'ALL_PASS';
  } else if (failedCount === results.length) {
    batchStatus = 'ALL_FAIL';
  } else {
    batchStatus = 'PARTIAL_FAIL';
  }

  return {
    results,
    collisions,
    status: batchStatus,
  };
}
