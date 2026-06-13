import { DiagnosticEventInfo } from './XDRParser';

export interface ParsedDiagnostics {
  error: ParsedError | null;
  callTraces: CallTrace[];
  events: DiagnosticEventInfo[];
  raw: string;
}

export interface ParsedError {
  code: number;
  contractType?: string;
  message: string;
  remediation: string[];
}

export interface CallTrace {
  contractId: string;
  functionName?: string;
  args: string[];
  returnValue?: string;
  success: boolean;
}

export interface DiagnosticsErrorCodeEntry {
  code: number;
  contractType: string;
  message: string;
  remediation: string[];
}

const ERROR_CODE_REGISTRY: Record<string, DiagnosticsErrorCodeEntry[]> = {
  token: [
    { code: 1, contractType: 'token', message: 'Insufficient balance for transfer', remediation: ['Check the source account has enough tokens', 'Verify the token contract address is correct'] },
    { code: 2, contractType: 'token', message: 'Transfer amount must be positive', remediation: ['Ensure the transfer amount is greater than 0'] },
    { code: 3, contractType: 'token', message: 'Insufficient allowance for transfer from', remediation: ['Increase the allowance via the approve function', 'Check the spender address is correct'] },
    { code: 4, contractType: 'token', message: 'Unauthorized caller', remediation: ['Verify the caller has the admin role', 'Use the correct admin account'] },
    { code: 5, contractType: 'token', message: 'Invalid token metadata or non-existent token', remediation: ['Verify the token contract ID is correct', 'Check the token has been properly initialized'] },
  ],
  'spot-dex': [
    { code: 1, contractType: 'spot-dex', message: 'Insufficient liquidity in the pool', remediation: ['Try a smaller trade amount', 'Add liquidity to the pool first'] },
    { code: 2, contractType: 'spot-dex', message: 'Price slippage exceeded the specified tolerance', remediation: ['Increase the slippage tolerance', 'Use a smaller order size'] },
    { code: 3, contractType: 'spot-dex', message: 'Invalid swap path', remediation: ['Verify the swap route is valid', 'Check that all intermediate token contracts exist'] },
    { code: 4, contractType: 'spot-dex', message: 'Pool is paused or disabled', remediation: ['Check the pool status', 'Try again after the pool is re-enabled'] },
  ],
  'atomic-swap': [
    { code: 1, contractType: 'atomic-swap', message: 'Swap proposal has expired', remediation: ['Create a new swap proposal with a later expiration', 'Request the counterparty to accept before expiry'] },
    { code: 2, contractType: 'atomic-swap', message: 'Counterparty has not approved the swap terms', remediation: ['Verify the counterparty address is correct', 'Resend the swap proposal'] },
    { code: 3, contractType: 'atomic-swap', message: 'Swap has already been completed or refunded', remediation: ['Check the swap status on chain', 'Create a new swap if needed'] },
    { code: 4, contractType: 'atomic-swap', message: 'Mismatched asset amounts or types', remediation: ['Verify both sides of the swap have the correct amounts', 'Ensure asset types match the proposal'] },
  ],
};

const GENERIC_WARNINGS: { pattern: RegExp; message: string }[] = [
  { pattern: /HostError/i, message: 'Host-level error occurred during contract execution' },
  { pattern: /budget\s+exceeded/i, message: 'Contract execution exceeded the resource budget' },
  { pattern: /timed?[-\s]?out/i, message: 'Contract execution timed out' },
  { pattern: /insufficient/i, message: 'Insufficient resources or balance for the operation' },
];

export class DiagnosticsParser {
  private knownContractTypes: Map<string, DiagnosticsErrorCodeEntry[]>;

  constructor() {
    this.knownContractTypes = new Map(Object.entries(ERROR_CODE_REGISTRY));
  }

  parse(rawError: string, events: DiagnosticEventInfo[]): ParsedDiagnostics {
    const parsedError = this.parseError(rawError);
    const callTraces = this.buildCallTraces(events);
    return {
      error: parsedError,
      callTraces,
      events,
      raw: rawError,
    };
  }

  parseError(raw: string): ParsedError | null {
    if (!raw) return null;

    const match = raw.match(/ContractError\((\d+)\)/);
    if (!match) {
      const generic = this.matchGeneric(raw);
      return generic ?? {
        code: 0,
        message: raw,
        remediation: ['Review the error output for details'],
      };
    }

    const errorCode = parseInt(match[1], 10);
    const contractType = this.inferContractType(raw);
    const entry = this.lookupErrorCode(errorCode, contractType);

    if (entry) {
      return { ...entry };
    }

    return {
      code: errorCode,
      contractType,
      message: `ContractError(${errorCode}) — unknown error code`,
      remediation: ['Consult the contract source code for error definitions'],
    };
  }

  lookupErrorCode(code: number, contractType?: string): ParsedError | null {
    if (contractType) {
      const entries = this.knownContractTypes.get(contractType);
      const entry = entries?.find((e) => e.code === code);
      if (entry) return { ...entry };
    }

    for (const [, entries] of this.knownContractTypes) {
      const entry = entries.find((e) => e.code === code);
      if (entry) return { ...entry };
    }

    return null;
  }

  getErrorMessage(code: number, contractType?: string): string {
    return this.lookupErrorCode(code, contractType)?.message ?? `Unknown error code: ${code}`;
  }

  buildCallTraces(events: DiagnosticEventInfo[]): CallTrace[] {
    return events.map((ev) => ({
      contractId: ev.contractId,
      functionName: ev.functionName,
      args: ev.topics.map((t) => JSON.stringify(t)),
      returnValue: ev.data ? JSON.stringify(ev.data) : undefined,
      success: ev.success,
    }));
  }

  private inferContractType(raw: string): string | undefined {
    for (const contractType of this.knownContractTypes.keys()) {
      if (raw.toLowerCase().includes(contractType)) {
        return contractType;
      }
    }
    return undefined;
  }

  private matchGeneric(raw: string): ParsedError | null {
    for (const warning of GENERIC_WARNINGS) {
      if (warning.pattern.test(raw)) {
        return {
          code: 0,
          message: warning.message,
          remediation: ['Review the contract function and arguments', 'Check the RPC endpoint is healthy'],
        };
      }
    }
    return null;
  }

  addErrorCode(contractType: string, entry: DiagnosticsErrorCodeEntry): void {
    const existing = this.knownContractTypes.get(contractType) ?? [];
    existing.push(entry);
    this.knownContractTypes.set(contractType, existing);
  }
}

export function createDiagnosticsParser(): DiagnosticsParser {
  return new DiagnosticsParser();
}
