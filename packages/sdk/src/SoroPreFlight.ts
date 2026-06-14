import { SimulationEngine } from '@soropreflight/core';
import { AIAnalysisEngine } from '@soropreflight/core';
import { CheckRunner } from '@soropreflight/core';
import { loadConfig } from '@soropreflight/core';
import { NETWORKS } from '@soropreflight/core';
import { Config, Network, SimulationResult, DeployResult, BatchResult } from '@soropreflight/core';
import {
  SoroPreFlightOptions,
  SimulateOptions,
  BatchSimulateOptions,
  DeployOptions,
  SuiteResult,
} from './types';
import { runSimulation } from './simulate';
import { runBatchSimulation } from './batch';
import { runSuite as executeSuite } from './suite';

export class SoroPreFlight {
  private config: Config;
  private engine: SimulationEngine;
  private checkRunner: CheckRunner;
  private aiEngine: AIAnalysisEngine;

  constructor(options: SoroPreFlightOptions = {}) {
    this.config = loadConfig(options.configPath);

    if (options.network) {
      this.config.network = options.network;
    }
    if (options.rpcUrl) {
      this.config.rpcUrl = options.rpcUrl;
    }
    if (options.anthropicApiKey) {
      this.config.anthropicApiKey = options.anthropicApiKey;
    }

    const networkConfig = NETWORKS[this.config.network];

    this.engine = SimulationEngine.create({
      network: this.config.network,
      rpcUrl: this.config.rpcUrl,
      networkPassphrase: networkConfig.networkPassphrase,
      timeout: this.config.simulation.timeout,
      maxRetries: this.config.simulation.maxRetries,
      forkLedger: this.config.simulation.forkLedger,
    });

    this.checkRunner = new CheckRunner();
    this.aiEngine = new AIAnalysisEngine({
      anthropicApiKey: this.config.anthropicApiKey,
      model: this.config.ai.model,
    });
  }

  getConfig(): Config {
    return { ...this.config };
  }

  getEngine(): SimulationEngine {
    return this.engine;
  }

  getCheckRunner(): CheckRunner {
    return this.checkRunner;
  }

  getAIEngine(): AIAnalysisEngine {
    return this.aiEngine;
  }

  async simulate(input: SimulateOptions): Promise<SimulationResult> {
    return runSimulation({
      input,
      engine: this.engine,
      checkRunner: this.checkRunner,
      aiEngine: this.aiEngine,
      config: this.config,
    });
  }

  async simulateBatch(input: BatchSimulateOptions): Promise<BatchResult> {
    return runBatchSimulation({
      input,
      engine: this.engine,
      checkRunner: this.checkRunner,
      aiEngine: this.aiEngine,
      config: this.config,
    });
  }

  async deploy(input: DeployOptions): Promise<DeployResult> {
    const networkConfig = NETWORKS[input.network || this.config.network];

    const simReq = {
      contractId: '',
      method: '',
      args: [],
      sourceAccount: input.sourceAccount,
      network: input.network || this.config.network,
      rpcUrl: input.rpcUrl || this.config.rpcUrl,
      wasm: input.wasm,
      wasmHash: input.wasmHash,
      analyze: input.analyze,
      analysisLevel: input.analysisLevel,
    };

    const result: DeployResult = {
      status: 'SUCCESS',
      wasmHash: input.wasmHash || '',
      checks: {},
      checkResults: [],
    };

    if (input.analyze && input.analysisLevel) {
      try {
        const aiResponse = await this.aiEngine.analyze({
          simulationResult: {
            id: '',
            status: 'SUCCESS',
            network: input.network || this.config.network,
            ledger: 0,
            contractId: '',
            method: '',
            fee: {
              minFee: 0, maxFee: 0, recommendedFee: 0,
              feeSurplusPercent: 0, instructions: 0,
              maxInstructions: 0, readBytes: 0, writeBytes: 0,
            },
            auth: [],
            checks: {},
            checkResults: [],
            raw: null,
            timestamp: new Date().toISOString(),
          },
          analysisLevel: input.analysisLevel,
          wasm: input.wasm,
        });
        result.ai = aiResponse;
      } catch {
      }
    }

    if (input.expectedWasmHash) {
      const deployChecks = this.checkRunner.runDeployChecks(result);
      result.checkResults = deployChecks;
      result.checks = this.checkRunner.getChecksMap(deployChecks);
    }

    return result;
  }

  async runSuite(suitePath: string): Promise<SuiteResult> {
    return executeSuite(suitePath, this);
  }
}
