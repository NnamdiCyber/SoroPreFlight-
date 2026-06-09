import { Network, NetworkConfig } from './types';

export const NETWORKS: Record<Network, NetworkConfig> = {
  mainnet: {
    rpcUrl: 'https://soroban-rpc.stellar.org',
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    sorobanRpcUrl: 'https://soroban-rpc.stellar.org',
  },
  testnet: {
    rpcUrl: 'https://soroban-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
    sorobanRpcUrl: 'https://soroban-testnet.stellar.org',
  },
  futurenet: {
    rpcUrl: 'https://rpc-futurenet.stellar.org',
    networkPassphrase: 'Test SDF Future Network ; October 2022',
    sorobanRpcUrl: 'https://rpc-futurenet.stellar.org',
  },
  local: {
    rpcUrl: 'http://localhost:8000/soroban/rpc',
    networkPassphrase: 'Standalone Network ; February 2017',
    sorobanRpcUrl: 'http://localhost:8000/soroban/rpc',
  },
};

export const DEFAULT_TIMEOUT = 30_000;

export const BUDGET_LIMITS = {
  maxInstructions: 100_000_000,
  maxReadBytes: 200_000,
  maxWriteBytes: 100_000,
  maxContractSize: 100_000,
  feeSurplusMinimum: 0.2,
  instructionWarningThreshold: 0.95,
  expiryWarningDays: 7,
  defaultFee: 100,
  minFee: 100,
  maxFee: 10_000_000,
  memoryLimit: 8_000_000,
  simulationTimeout: 30_000,
  maxRetries: 3,
} as const;

export const DEFAULT_RETRY_DELAYS = [1_000, 2_000, 4_000] as const;

export const SOROBAN_RPC_ENDPOINTS = {
  simulateTransaction: 'simulateTransaction',
  getLedgerEntries: 'getLedgerEntries',
  getLatestLedger: 'getLatestLedger',
  getTransaction: 'getTransaction',
  sendTransaction: 'sendTransaction',
} as const;
