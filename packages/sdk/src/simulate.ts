import {
  SimulationEngine,
  CheckRunner,
  AIAnalysisEngine,
  Config,
  SimulationResult,
  SimulationRequest,
  AIRequest,
  AIAnalysisLevel,
} from '@soropreflight/core';
import { SimulateOptions } from './types';

export interface RunSimulationInput {
  input: SimulateOptions;
  engine: SimulationEngine;
  checkRunner: CheckRunner;
  aiEngine: AIAnalysisEngine;
  config: Config;
}

export async function runSimulation(input: RunSimulationInput): Promise<SimulationResult> {
  const { input: opts, engine, checkRunner, aiEngine, config } = input;

  const request: SimulationRequest = {
    contractId: opts.contractId,
    method: opts.method,
    args: opts.args,
    sourceAccount: opts.sourceAccount,
    network: opts.network || config.network,
    rpcUrl: opts.rpcUrl || config.rpcUrl,
    forkLedger: opts.forkLedger ?? config.simulation.forkLedger,
    analyze: opts.analyze,
    analysisLevel: opts.analysisLevel || config.ai.analysisLevel,
  };

  const result = await engine.simulate(request);

  const checkRunnerOpts: Record<string, unknown> = {};
  if (opts.requiredSigners) checkRunnerOpts.requiredSigners = opts.requiredSigners;
  if (opts.expectedMinFee !== undefined) checkRunnerOpts.expectedMinFee = opts.expectedMinFee;
  if (opts.expectedMaxFee !== undefined) checkRunnerOpts.expectedMaxFee = opts.expectedMaxFee;

  const checkRunnerInstance = new CheckRunner(checkRunnerOpts as any);
  const checkResults = checkRunnerInstance.runSimulationChecks(result);
  result.checkResults = checkResults;
  result.checks = checkRunnerInstance.getChecksMap(checkResults);

  if (opts.analyze && opts.analysisLevel) {
    const aiRequest: AIRequest = {
      simulationResult: result,
      analysisLevel: opts.analysisLevel,
    };

    try {
      const aiResponse = await aiEngine.analyze(aiRequest);
      result.ai = aiResponse;
    } catch {
    }
  }

  return result;
}
