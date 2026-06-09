import { Network, AIAnalysisLevel } from './types';
import { NETWORKS, DEFAULT_TIMEOUT, BUDGET_LIMITS } from './constants';

export interface AIConfig {
  enabled: boolean;
  model: string;
  analysisLevel: AIAnalysisLevel;
}

export interface SimulationConfig {
  forkLedger: number | null;
  timeout: number;
  maxRetries: number;
}

export interface ReportingConfig {
  format: string[];
  outputDir: string;
  webhookUrl: string | null;
}

export interface EnterpriseConfig {
  workspaceId: string | null;
  auditLog: boolean;
}

export interface SSOConfig {
  provider: string;
  entryPoint: string;
  certificate: string;
  attributeMapping: Record<string, string>;
}

export interface Config {
  network: Network;
  rpcUrl: string;
  networkPassphrase: string;
  ai: AIConfig;
  simulation: SimulationConfig;
  reporting: ReportingConfig;
  enterprise: EnterpriseConfig;
  sso?: SSOConfig;
  anthropicApiKey?: string;
  stellarSecretKey?: string;
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[] ? U[] : T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export function loadConfig(configPath?: string): Config {
  let fileConfig: DeepPartial<Config> = {};

  if (configPath) {
    try {
      fileConfig = require(configPath) as DeepPartial<Config>;
    } catch {
      console.warn(`Config file not found at ${configPath}, using defaults`);
    }
  }

  const loadedNetwork = getEnvNetwork() || fileConfig.network || 'testnet';
  const networkConfig = NETWORKS[loadedNetwork];

  const config: Config = {
    network: loadedNetwork,
    rpcUrl: getEnv('SOROPREFLIGHT_RPC_URL') || fileConfig.rpcUrl || networkConfig.rpcUrl,
    networkPassphrase: getEnv('SOROPREFLIGHT_NETWORK_PASSPHRASE') || fileConfig.networkPassphrase || networkConfig.networkPassphrase,
    ai: {
      enabled: getEnvBool('SOROPREFLIGHT_AI_ENABLED') ?? fileConfig.ai?.enabled ?? true,
      model: getEnv('SOROPREFLIGHT_AI_MODEL') || fileConfig.ai?.model || 'claude-sonnet-4',
      analysisLevel: (getEnv('SOROPREFLIGHT_AI_ANALYSIS_LEVEL') as AIAnalysisLevel) || fileConfig.ai?.analysisLevel || 'deep',
    },
    simulation: {
      forkLedger: getEnvNumber('SOROPREFLIGHT_FORK_LEDGER') ?? fileConfig.simulation?.forkLedger ?? null,
      timeout: getEnvNumber('SOROPREFLIGHT_SIMULATION_TIMEOUT') ?? fileConfig.simulation?.timeout ?? DEFAULT_TIMEOUT,
      maxRetries: getEnvNumber('SOROPREFLIGHT_MAX_RETRIES') ?? fileConfig.simulation?.maxRetries ?? BUDGET_LIMITS.maxRetries,
    },
    reporting: {
      format: fileConfig.reporting?.format ?? ['json', 'html'],
      outputDir: getEnv('SOROPREFLIGHT_OUTPUT_DIR') || fileConfig.reporting?.outputDir || './preflight-reports',
      webhookUrl: getEnv('SOROPREFLIGHT_WEBHOOK_URL') || fileConfig.reporting?.webhookUrl || null,
    },
    enterprise: {
      workspaceId: getEnv('SOROPREFLIGHT_WORKSPACE_ID') || fileConfig.enterprise?.workspaceId || null,
      auditLog: getEnvBool('SOROPREFLIGHT_AUDIT_LOG') ?? fileConfig.enterprise?.auditLog ?? true,
    },
    anthropicApiKey: getEnv('ANTHROPIC_API_KEY') || fileConfig.anthropicApiKey,
    stellarSecretKey: getEnv('STELLAR_SECRET_KEY') || fileConfig.stellarSecretKey,
  };

  if (fileConfig.sso) {
    config.sso = fileConfig.sso;
  }

  return config;
}

function getEnv(key: string): string | undefined {
  return process.env[key];
}

function getEnvNumber(key: string): number | undefined {
  const val = process.env[key];
  if (val === undefined || val === '') return undefined;
  const num = Number(val);
  return Number.isNaN(num) ? undefined : num;
}

function getEnvBool(key: string): boolean | undefined {
  const val = process.env[key];
  if (val === undefined || val === '') return undefined;
  return val === 'true' || val === '1';
}

function getEnvNetwork(): Network | undefined {
  const val = process.env['SOROPREFLIGHT_NETWORK'];
  if (val === 'mainnet' || val === 'testnet' || val === 'futurenet' || val === 'local') {
    return val;
  }
  return undefined;
}
