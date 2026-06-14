import type {
  Network,
  AIAnalysisLevel,
  ScVal,
  SimulationResult,
  DeployResult,
  Config,
} from '@soropreflight/core';

export type {
  Network,
  CheckStatus,
  Severity,
  AIAnalysisLevel,
  PreflightCheck,
  CheckResult,
  SimulationRequest,
  ScVal,
  SimulationResult,
  SimulationError,
  FeeEstimate,
  AuthResult,
  AIRequest,
  AIResponse,
  ErrorExplanation,
  OptimizationAdvice,
  ContractAudit,
  Vulnerability,
  DeployRequest,
  DeployResult,
  BatchSimulationRequest,
  BatchResult,
  SuiteDefinition,
  SuiteSetup,
  SuiteSimulation,
  Workspace,
  WorkspaceMember,
  Role,
  User,
  RBACPolicy,
  RBACPolicyEntry,
  SimulationReport,
  ReportMetadata,
  NetworkConfig,
  Config,
} from '@soropreflight/core';

export interface SimulateOptions {
  contractId: string;
  method: string;
  args: ScVal[];
  sourceAccount: string;
  network?: Network;
  rpcUrl?: string;
  forkLedger?: number | null;
  analyze?: boolean;
  analysisLevel?: AIAnalysisLevel;
  requiredSigners?: string[];
  expectedMinFee?: number;
  expectedMaxFee?: number;
}

export interface BatchSimulateOptions {
  operations: SimulateOptions[];
  concurrency?: number;
}

export interface DeployOptions {
  wasm: string;
  sourceAccount: string;
  wasmHash?: string;
  analyze?: boolean;
  analysisLevel?: AIAnalysisLevel;
  network?: Network;
  rpcUrl?: string;
  expectedWasmHash?: string;
}

export interface SuiteResult {
  name: string;
  network: Network;
  results: SuiteStepResult[];
  status: 'ALL_PASS' | 'PARTIAL_FAIL' | 'ALL_FAIL';
  duration: number;
}

export interface SuiteStepResult {
  name: string;
  type: 'deploy' | 'simulate';
  status: 'SUCCESS' | 'FAIL' | 'ERROR';
  result?: SimulationResult | DeployResult;
  error?: string;
  expected?: Record<string, unknown>;
}

export interface SoroPreFlightOptions {
  network?: Network;
  rpcUrl?: string;
  anthropicApiKey?: string;
  configPath?: string;
}
