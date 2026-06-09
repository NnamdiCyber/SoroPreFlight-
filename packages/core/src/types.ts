export type Network = 'mainnet' | 'testnet' | 'futurenet' | 'local';

export type CheckStatus = 'PASS' | 'FAIL' | 'WARN' | 'SKIP';

export type Severity = 'error' | 'warn' | 'info';

export type AIAnalysisLevel = 'basic' | 'deep' | 'audit';

export enum PreflightCheck {
  EXEC_SUCCESS = 'EXEC_SUCCESS',
  EXEC_BUDGET = 'EXEC_BUDGET',
  EXEC_MEMORY = 'EXEC_MEMORY',
  EXEC_TIMEOUT = 'EXEC_TIMEOUT',
  FEE_ESTIMATE = 'FEE_ESTIMATE',
  FEE_SURPLUS = 'FEE_SURPLUS',
  LEDGER_READS = 'LEDGER_READS',
  LEDGER_WRITES = 'LEDGER_WRITES',
  AUTH_SIGNERS = 'AUTH_SIGNERS',
  AUTH_THRESHOLDS = 'AUTH_THRESHOLDS',
  AUTH_SEQUENCE = 'AUTH_SEQUENCE',
  AUTH_INVOCATIONS = 'AUTH_INVOCATIONS',
  STATE_FOOTPRINT = 'STATE_FOOTPRINT',
  STATE_EXPIRY = 'STATE_EXPIRY',
  STATE_COLLISION = 'STATE_COLLISION',
  DEPLOY_WASM_VALID = 'DEPLOY_WASM_VALID',
  DEPLOY_SIZE = 'DEPLOY_SIZE',
  DEPLOY_UPGRADE_SAFE = 'DEPLOY_UPGRADE_SAFE',
  DEPLOY_HASH = 'DEPLOY_HASH',
}

export interface CheckResult {
  check: PreflightCheck;
  status: CheckStatus;
  message: string;
  severity: Severity;
}

export interface SimulationRequest {
  contractId: string;
  method: string;
  args: ScVal[];
  sourceAccount: string;
  network?: Network;
  rpcUrl?: string;
  forkLedger?: number | null;
  analyze?: boolean;
  analysisLevel?: AIAnalysisLevel;
}

export interface ScVal {
  type: 'address' | 'i128' | 'u64' | 'i64' | 'u32' | 'i32' | 'bool' | 'symbol' | 'bytes' | 'string' | 'vec' | 'map' | 'void';
  value: unknown;
}

export interface SimulationResult {
  id: string;
  status: 'SUCCESS' | 'FAIL' | 'ERROR';
  network: Network;
  ledger: number;
  contractId: string;
  method: string;
  fee: FeeEstimate;
  auth: AuthResult[];
  checks: Record<string, CheckStatus>;
  checkResults: CheckResult[];
  ai?: AIResponse;
  error?: SimulationError;
  raw: unknown;
  timestamp: string;
}

export interface SimulationError {
  code: string;
  message: string;
  diagnostic?: string;
}

export interface FeeEstimate {
  minFee: number;
  maxFee: number;
  recommendedFee: number;
  feeSurplusPercent: number;
  instructions: number;
  maxInstructions: number;
  readBytes: number;
  writeBytes: number;
}

export interface AuthResult {
  signer: string;
  authorized: boolean;
  weight?: number;
  threshold?: number;
}

export interface AIRequest {
  simulationResult: SimulationResult;
  analysisLevel: AIAnalysisLevel;
  contractSource?: string;
  wasm?: string;
}

export interface AIResponse {
  level: AIAnalysisLevel;
  summary: string;
  suggestions: string[];
  fix?: string;
  audit?: ContractAudit;
  errorExplanation?: ErrorExplanation;
  optimization?: OptimizationAdvice;
}

export interface ErrorExplanation {
  raw: string;
  explanation: string;
  contractName?: string;
  functionName?: string;
  relevantAccounts: string[];
  remediation: string[];
}

export interface OptimizationAdvice {
  redundantReads: string[];
  hotPaths: string[];
  storageInefficiencies: string[];
  batchingOpportunities: string[];
  feeOptimization: string[];
}

export interface ContractAudit {
  vulnerabilities: Vulnerability[];
  accessControlIssues: string[];
  economicAttackSurface: string[];
  bestPracticeViolations: string[];
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
}

export interface Vulnerability {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location?: string;
  description: string;
  remediation: string;
}

export interface DeployRequest {
  wasm: string;
  sourceAccount: string;
  wasmHash?: string;
  analyze?: boolean;
  analysisLevel?: AIAnalysisLevel;
  network?: Network;
  rpcUrl?: string;
}

export interface DeployResult {
  status: 'SUCCESS' | 'FAIL' | 'ERROR';
  contractId?: string;
  wasmHash: string;
  checks: Record<string, CheckStatus>;
  checkResults: CheckResult[];
  ai?: AIResponse;
  error?: SimulationError;
}

export interface BatchSimulationRequest {
  operations: SimulationRequest[];
  concurrency?: number;
}

export interface BatchResult {
  results: SimulationResult[];
  collisions: string[];
  status: 'ALL_PASS' | 'PARTIAL_FAIL' | 'ALL_FAIL';
}

export interface SuiteDefinition {
  name: string;
  network: Network;
  setup?: SuiteSetup;
  simulations: SuiteSimulation[];
}

export interface SuiteSetup {
  deploy?: {
    wasm: string;
    source: string;
    alias: string;
  };
}

export interface SuiteSimulation {
  name: string;
  contract: string;
  function: string;
  args: ScVal[];
  expect: {
    status: string;
    max_fee_xlm?: number;
    checks?: Record<string, string>;
    error_contains?: string;
  };
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  members: WorkspaceMember[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  userId: string;
  role: Role;
  joinedAt: string;
}

export type Role = 'owner' | 'admin' | 'developer' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  roles: Role[];
  workspaceId?: string;
  createdAt: string;
}

export interface RBACPolicy {
  policies: RBACPolicyEntry[];
}

export interface RBACPolicyEntry {
  role: Role;
  allow: string[];
  deny: string[];
}

export interface SimulationReport {
  id: string;
  simulationId: string;
  status: 'PASSED' | 'FAILED' | 'ERROR';
  summary: string;
  checks: CheckResult[];
  fee: FeeEstimate;
  auth: AuthResult[];
  ai?: AIResponse;
  reportUrl?: string;
  createdAt: string;
  metadata: ReportMetadata;
}

export interface ReportMetadata {
  user?: string;
  workspaceId?: string;
  gitCommitSha?: string;
  environment?: string;
  duration: number;
}

export interface NetworkConfig {
  rpcUrl: string;
  networkPassphrase: string;
  sorobanRpcUrl?: string;
}
