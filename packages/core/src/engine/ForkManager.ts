import { Network } from '../types';
import { NETWORKS } from '../constants';

export interface ForkConfig {
  forkLedger: number | null;
  network: Network;
  rpcUrl: string;
}

export interface ForkOverride {
  ledgerVersion?: number;
  resourceConfig?: {
    cpuInstructions?: number;
    memBytes?: number;
  };
}

export class ForkManager {
  private readonly forkLedger: number | null;
  private readonly network: Network;
  private readonly rpcUrl: string;

  constructor(config: ForkConfig) {
    this.forkLedger = config.forkLedger;
    this.network = config.network;
    this.rpcUrl = config.rpcUrl;
  }

  get isForked(): boolean {
    return this.forkLedger !== null && this.forkLedger > 0;
  }

  getForkOverrides(): ForkOverride {
    if (!this.isForked) {
      return {};
    }

    return {
      ledgerVersion: this.forkLedger!,
    };
  }

  getResourceConfig(): { cpuInstructions: number; memBytes: number } | undefined {
    if (!this.isForked) {
      return undefined;
    }

    return {
      cpuInstructions: 100_000_000,
      memBytes: 8_000_000,
    };
  }

  createSnapshotLabel(): string {
    if (!this.isForked) {
      return `live:${this.network}`;
    }
    return `fork:${this.network}@${this.forkLedger}`;
  }

  getRpcUrl(): string {
    return this.rpcUrl;
  }

  getNetworkPassphrase(): string {
    return NETWORKS[this.network].networkPassphrase;
  }

  validateForkLedger(): { valid: boolean; message?: string } {
    if (this.forkLedger === null || this.forkLedger === undefined) {
      return { valid: true };
    }

    if (!Number.isInteger(this.forkLedger) || this.forkLedger < 1) {
      return { valid: false, message: `Invalid fork ledger: ${this.forkLedger}. Must be a positive integer.` };
    }

    return { valid: true };
  }
}
