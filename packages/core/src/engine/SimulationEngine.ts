import { rpc, Contract, TransactionBuilder, Account, Keypair, Transaction, xdr, nativeToScVal } from '@stellar/stellar-sdk';
import { SimulationResult, SimulationRequest, Network, FeeEstimate, AuthResult } from '../types';
import { BUDGET_LIMITS, DEFAULT_TIMEOUT } from '../constants';
import { ForkManager } from './ForkManager';
import { ResourceEstimator, ResourceEstimatorInput } from './ResourceEstimator';
import { randomUUID } from 'crypto';

export interface SimulationEngineOptions {
  network: Network;
  rpcUrl: string;
  networkPassphrase: string;
  timeout?: number;
  maxRetries?: number;
  forkLedger?: number | null;
}

export class SimulationEngine {
  private readonly server: rpc.Server;
  private readonly network: Network;
  private readonly networkPassphrase: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly forkManager: ForkManager;
  private readonly resourceEstimator: ResourceEstimator;

  constructor(options: SimulationEngineOptions) {
    this.server = new rpc.Server(options.rpcUrl, { timeout: options.timeout ?? DEFAULT_TIMEOUT });
    this.network = options.network;
    this.networkPassphrase = options.networkPassphrase;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = options.maxRetries ?? BUDGET_LIMITS.maxRetries;
    this.forkManager = new ForkManager({
      forkLedger: options.forkLedger ?? null,
      network: options.network,
      rpcUrl: options.rpcUrl,
    });
    this.resourceEstimator = new ResourceEstimator(BUDGET_LIMITS.defaultFee);
  }

  static create(options: SimulationEngineOptions): SimulationEngine {
    return new SimulationEngine(options);
  }

  async simulate(input: SimulationRequest): Promise<SimulationResult> {
    const id = randomUUID();
    const timestamp = new Date().toISOString();

    try {
      const sourceKeypair = this.parseKeypair(input.sourceAccount);
      const sourcePublicKey = sourceKeypair.publicKey();

      const account = new Account(sourcePublicKey, '0');
      const ledgerSeq = await this.fetchLatestLedger();

      const scvalArgs = this.convertArgs(input.args);
      const tx = this.buildTransaction(account, input.contractId, input.method, scvalArgs);

      const simResponse = await this.executeWithRetry(() =>
        this.server.simulateTransaction(tx),
      );

      return this.parseSimulationResponse(id, simResponse, input, sourcePublicKey, ledgerSeq, timestamp);
    } catch (err) {
      return this.handleSimulationError(id, err, input, timestamp);
    }
  }

  getServer(): rpc.Server {
    return this.server;
  }

  getForkManager(): ForkManager {
    return this.forkManager;
  }

  getResourceEstimator(): ResourceEstimator {
    return this.resourceEstimator;
  }

  private convertArgs(args: SimulationRequest['args']): xdr.ScVal[] {
    return args.map(a => this.convertScVal(a));
  }

  private convertScVal(arg: SimulationRequest['args'][0]): xdr.ScVal {
    if (arg.type === 'address') {
      return new (require('@stellar/stellar-sdk').Address)(arg.value as string).toScVal();
    }
    if (arg.type === 'vec') {
      const items = (arg.value as SimulationRequest['args']).map(a => this.convertScVal(a));
      return xdr.ScVal.scvVec(items);
    }
    if (arg.type === 'void') {
      return xdr.ScVal.scvVoid();
    }
    if (arg.type === 'bytes') {
      return xdr.ScVal.scvBytes(Buffer.from(arg.value as string, 'hex'));
    }
    if (arg.type === 'symbol') {
      return xdr.ScVal.scvSymbol(arg.value as string);
    }
    return nativeToScVal(arg.value, { type: arg.type === 'i128' ? 'i128' : undefined });
  }

  private buildTransaction(
    account: Account,
    contractId: string,
    method: string,
    args: xdr.ScVal[],
  ): Transaction {
    const contract = new Contract(contractId);

    const tx = new TransactionBuilder(account, {
      fee: String(BUDGET_LIMITS.defaultFee),
      networkPassphrase: this.networkPassphrase,
    })
      .setTimeout(30)
      .addOperation(contract.call(method, ...args))
      .build();

    return tx;
  }

  private async fetchLatestLedger(): Promise<number> {
    try {
      const ledger = await this.server.getLatestLedger();
      return ledger.sequence;
    } catch {
      return 0;
    }
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const result = await this.withTimeout(fn());
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        if (attempt < this.maxRetries - 1) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError ?? new Error('Simulation failed after retries');
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    const timeoutMs = this.timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Simulation timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  private parseSimulationResponse(
    id: string,
    simResponse: rpc.Api.SimulateTransactionResponse,
    input: SimulationRequest,
    _sourcePublicKey: string,
    ledgerSeq: number,
    timestamp: string,
  ): SimulationResult {
    if (rpc.Api.isSimulationError(simResponse)) {
      return this.buildErrorResult(id, simResponse, input, ledgerSeq, timestamp, 'SIMULATION_ERROR', simResponse.error);
    }

    if (rpc.Api.isSimulationRestore(simResponse)) {
      return this.buildErrorResult(
        id, simResponse, input, ledgerSeq, timestamp,
        'RESTORATION_REQUIRED',
        'Ledger entry restoration is required before simulation can proceed',
      );
    }

    const cost = simResponse.cost;
    const readBytes = this.calculateReadBytes(simResponse);
    const writeBytes = this.calculateWriteBytes(simResponse);

    const resourceInput: ResourceEstimatorInput = {
      cost: {
        cpuInsns: parseInt(cost?.cpuInsns ?? '0', 10),
        memBytes: parseInt(cost?.memBytes ?? '0', 10),
      },
      minResourceFee: simResponse.minResourceFee ?? '0',
      readBytes,
      writeBytes,
    };

    const resourceEstimate = this.resourceEstimator.estimate(resourceInput);
    const authResults = this.extractAuthResults(simResponse);
    const fee = this.resourceEstimator.estimateToFeeEstimate(resourceEstimate);

    return {
      id,
      status: 'SUCCESS',
      network: this.network,
      ledger: simResponse.latestLedger || ledgerSeq,
      contractId: input.contractId,
      method: input.method,
      fee,
      auth: authResults,
      checks: {},
      checkResults: [],
      raw: simResponse,
      timestamp,
    };
  }

  private buildErrorResult(
    id: string,
    simResponse: rpc.Api.SimulateTransactionResponse,
    input: SimulationRequest,
    ledgerSeq: number,
    timestamp: string,
    code: string,
    message: string,
  ): SimulationResult {
    return {
      id,
      status: 'FAIL',
      network: this.network,
      ledger: simResponse.latestLedger || ledgerSeq,
      contractId: input.contractId,
      method: input.method,
      fee: this.createEmptyFee(),
      auth: [],
      checks: {},
      checkResults: [],
      error: {
        code,
        message,
        diagnostic: 'events' in simResponse ? this.extractDiagnosticEvents(simResponse.events) : undefined,
      },
      raw: simResponse,
      timestamp,
    };
  }

  private handleSimulationError(
    id: string,
    err: unknown,
    input: SimulationRequest,
    timestamp: string,
  ): SimulationResult {
    const message = err instanceof Error ? err.message : String(err);
    let code = 'UNKNOWN_ERROR';

    if (message.includes('timed out') || message.includes('TIMEOUT')) {
      code = 'TIMEOUT';
    } else if (message.includes('ECONNREFUSED') || message.includes('ENOTFOUND') || message.includes('network')) {
      code = 'NETWORK_ERROR';
    } else if (message.includes('ContractError') || message.includes('HostError')) {
      code = 'CONTRACT_ERROR';
    }

    return {
      id,
      status: 'ERROR',
      network: this.network,
      ledger: 0,
      contractId: input.contractId,
      method: input.method,
      fee: this.createEmptyFee(),
      auth: [],
      checks: {},
      checkResults: [],
      error: { code, message },
      raw: null,
      timestamp,
    };
  }

  private extractAuthResults(simResponse: rpc.Api.SimulateTransactionSuccessResponse): AuthResult[] {
    const authEntries: AuthResult[] = [];

    if (simResponse.result?.auth) {
      for (const authEntry of simResponse.result.auth) {
        authEntries.push({
          signer: 'required-auth-entry',
          authorized: true,
        });
      }
    }

    return authEntries;
  }

  private extractDiagnosticEvents(events: xdr.DiagnosticEvent[]): string {
    if (!events || events.length === 0) return '';
    try {
      return events
        .map(e => `[${e.inSuccessfulContractCall() ? 'success' : 'failure'}]`)
        .join('; ');
    } catch {
      return `[${events.length} diagnostic events]`;
    }
  }

  private calculateReadBytes(simResponse: rpc.Api.SimulateTransactionSuccessResponse): number {
    try {
      const resources = simResponse.transactionData.build().resources();
      return Math.max(resources.footprint().readOnly().length * 1024, 0);
    } catch {
      return simResponse.stateChanges?.length ? simResponse.stateChanges.length * 512 : 0;
    }
  }

  private calculateWriteBytes(simResponse: rpc.Api.SimulateTransactionSuccessResponse): number {
    try {
      const resources = simResponse.transactionData.build().resources();
      return Math.max(resources.footprint().readWrite().length * 1024, 0);
    } catch {
      return 0;
    }
  }

  private parseKeypair(source: string): Keypair {
    if (source.startsWith('S')) {
      return Keypair.fromSecret(source);
    }
    return Keypair.fromPublicKey(source);
  }

  private createEmptyFee(): FeeEstimate {
    return {
      minFee: 0, maxFee: 0, recommendedFee: 0,
      feeSurplusPercent: 0, instructions: 0,
      maxInstructions: BUDGET_LIMITS.maxInstructions,
      readBytes: 0, writeBytes: 0,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
