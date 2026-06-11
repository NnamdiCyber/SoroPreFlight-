import { ErrorExplanation, SimulationResult } from '../types';

export interface ErrorExplainerInput {
  result?: SimulationResult;
  knownContracts?: KnownContract[];
}

export interface KnownContract {
  id: string;
  name: string;
  functions: string[];
}

export interface ErrorCodeEntry {
  code: number;
  contractType: string;
  message: string;
  remediation: string[];
}

const ERROR_CODE_REGISTRY: Record<string, ErrorCodeEntry[]> = {
  token: [
    { code: 1, contractType: 'token', message: 'Insufficient balance for transfer', remediation: ['Check the source account has enough tokens', 'Verify the token contract address is correct'] },
    { code: 2, contractType: 'token', message: 'Transfer amount must be positive', remediation: ['Ensure the transfer amount is greater than 0'] },
    { code: 3, contractType: 'token', message: 'Insufficient allowance for transfer from', remediation: ['Increase the allowance via the approve function', 'Check the spender address is correct'] },
    { code: 4, contractType: 'token', message: 'Unauthorized: caller does not have the required permission', remediation: ['Verify the caller has the admin role', 'Use the correct admin account'] },
    { code: 5, contractType: 'token', message: 'Invalid token metadata or non-existent token', remediation: ['Verify the token contract ID is correct', 'Check the token has been properly initialized'] },
  ],
  'spot-dex': [
    { code: 1, contractType: 'spot-dex', message: 'Insufficient liquidity in the pool', remediation: ['Try a smaller trade amount', 'Add liquidity to the pool first'] },
    { code: 2, contractType: 'spot-dex', message: 'Price slippage exceeded the specified tolerance', remediation: ['Increase the slippage tolerance', 'Use a smaller order size'] },
    { code: 3, contractType: 'spot-dex', message: 'Invalid swap path — one or more hops are invalid', remediation: ['Verify the swap route is valid', 'Check that all intermediate token contracts exist'] },
    { code: 4, contractType: 'spot-dex', message: 'Pool is paused or disabled', remediation: ['Check the pool status', 'Try again after the pool is re-enabled'] },
  ],
  'atomic-swap': [
    { code: 1, contractType: 'atomic-swap', message: 'Swap proposal has expired', remediation: ['Create a new swap proposal with a later expiration', 'Request the counterparty to accept before expiry'] },
    { code: 2, contractType: 'atomic-swap', message: 'Counterparty has not approved the swap terms', remediation: ['Verify the counterparty address is correct', 'Resend the swap proposal'] },
    { code: 3, contractType: 'atomic-swap', message: 'Swap has already been completed or refunded', remediation: ['Check the swap status on chain', 'Create a new swap if needed'] },
    { code: 4, contractType: 'atomic-swap', message: 'Mismatched asset amounts or types in the swap', remediation: ['Verify both sides of the swap have the correct amounts', 'Ensure asset types match the proposal'] },
  ],
};

const GENERIC_ERROR_PATTERNS: { pattern: RegExp; message: string; remediation: string[] }[] = [
  { pattern: /HostError/i, message: 'Host-level error occurred during contract execution', remediation: ['Check the contract function arguments are valid', 'Verify the contract is properly deployed'] },
  { pattern: /ContractError\((\d+)\)/, message: 'Contract returned an error code', remediation: ['Look up the specific error code in the contract documentation', 'Review the contract function preconditions'] },
  { pattern: /budget exceeded/i, message: 'Contract execution exceeded the resource budget', remediation: ['Optimize the contract to use fewer instructions', 'Increase the transaction fee for more resources'] },
  { pattern: /timed?[-\s]?out/i, message: 'Contract execution timed out', remediation: ['Optimize the contract for faster execution', 'Increase the simulation timeout'] },
  { pattern: /insufficient/i, message: 'Insufficient resources or balance for the operation', remediation: ['Check account balances and allowances', 'Reduce the operation size'] },
  { pattern: /unauthorized|not.*authorized/i, message: 'The caller lacks the required authorization', remediation: ['Verify the source account has the right permissions', 'Use a different account with the required role'] },
  { pattern: /not found/i, message: 'The requested contract, account, or resource was not found', remediation: ['Verify the contract ID, account address, or resource key is correct'] },
  { pattern: /already exists/i, message: 'The resource already exists and cannot be created again', remediation: ['Use the existing resource instead', 'Choose a different identifier'] },
];

export class ErrorExplainer {
  private knownContracts: Map<string, KnownContract>;

  constructor(input?: ErrorExplainerInput) {
    this.knownContracts = new Map();
    if (input?.knownContracts) {
      for (const c of input.knownContracts) {
        this.knownContracts.set(c.id, c);
      }
    }
  }

  explain(result: SimulationResult): ErrorExplanation {
    const raw = result.error?.message || result.error?.diagnostic || '';
    const diagnostic = result.error?.diagnostic || '';

    if (!raw) {
      if (result.status === 'SUCCESS') {
        return {
          raw: '',
          explanation: 'No error to explain — simulation completed successfully',
          relevantAccounts: [],
          remediation: [],
        };
      }
      return {
        raw: '',
        explanation: 'Unknown error with no diagnostic information available',
        relevantAccounts: [],
        remediation: ['Re-run the simulation with verbose logging enabled', 'Check the Soroban RPC endpoint is healthy'],
      };
    }

    const registryResult = this.lookupInRegistry(raw, diagnostic);
    if (registryResult) return registryResult;

    const patternResult = this.matchPattern(raw);
    if (patternResult) return patternResult;

    return this.buildGenericExplanation(raw, result);
  }

  addKnownContract(contract: KnownContract): void {
    this.knownContracts.set(contract.id, contract);
  }

  private lookupInRegistry(raw: string, diagnostic: string): ErrorExplanation | null {
    const errorCodeMatch = raw.match(/ContractError\((\d+)\)/);
    if (!errorCodeMatch) return null;

    const errorCode = parseInt(errorCodeMatch[1], 10);

    const contractHint = this.inferContractName(raw);
    const entries = contractHint && ERROR_CODE_REGISTRY[contractHint]
      ? ERROR_CODE_REGISTRY[contractHint]
      : null;

    const candidates = entries || Object.values(ERROR_CODE_REGISTRY).flat();
    const entry = candidates.find(e => e.code === errorCode);

    if (entry) {
      return {
        raw,
        explanation: entry.message,
        contractName: entry.contractType,
        functionName: this.inferFunctionName(diagnostic),
        relevantAccounts: this.extractAccounts(raw),
        remediation: entry.remediation,
      };
    }

    return {
      raw,
      explanation: `ContractError(${errorCode}) — unknown error code. Reference the contract documentation for details.`,
      relevantAccounts: this.extractAccounts(raw),
      remediation: ['Consult the contract source code for error code definitions', 'Check the contract documentation for this specific error'],
    };
  }

  private matchPattern(raw: string): ErrorExplanation | null {
    for (const entry of GENERIC_ERROR_PATTERNS) {
      const match = raw.match(entry.pattern);
      if (match) {
        return {
          raw,
          explanation: entry.message,
          contractName: this.inferContractName(raw),
          functionName: this.inferFunctionName(raw),
          relevantAccounts: this.extractAccounts(raw),
          remediation: entry.remediation,
        };
      }
    }
    return null;
  }

  private buildGenericExplanation(raw: string, result: SimulationResult): ErrorExplanation {
    return {
      raw,
      explanation: `Simulation failed with status "${result.status}"`,
      contractName: result.contractId,
      functionName: result.method,
      relevantAccounts: this.extractAccounts(raw),
      remediation: [
        'Review the contract function and arguments',
        `Check the contract ${result.contractId} is deployed on the network`,
        'Enable verbose output for more details',
      ],
    };
  }

  private inferContractName(raw: string, fallback?: string): string | undefined {
    if (fallback) return fallback;

    for (const [contractType] of Object.entries(ERROR_CODE_REGISTRY)) {
      if (raw.toLowerCase().includes(contractType)) {
        return contractType;
      }
    }
    return undefined;
  }

  private inferFunctionName(diagnostic: string): string | undefined {
    const fnMatch = diagnostic.match(/function\s+(\w+)/i);
    return fnMatch ? fnMatch[1] : undefined;
  }

  private extractAccounts(raw: string): string[] {
    const accounts: string[] = [];
    const keyMatch = raw.match(/G[A-Z0-9]{55}/g);
    if (keyMatch) {
      const unique = [...new Set(keyMatch)];
      if (unique.length > 0) {
        accounts.push(...unique.slice(0, 5));
      }
    }
    return accounts;
  }

  getKnownContractTypes(): string[] {
    return Object.keys(ERROR_CODE_REGISTRY);
  }
}

export function createErrorExplanation(result: SimulationResult): ErrorExplanation {
  const explainer = new ErrorExplainer();
  return explainer.explain(result);
}
