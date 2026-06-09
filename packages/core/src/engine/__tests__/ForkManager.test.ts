import { describe, it, expect } from 'vitest';
import { ForkManager } from '../ForkManager';

describe('ForkManager', () => {
  it('should not be forked when forkLedger is null', () => {
    const fm = new ForkManager({
      forkLedger: null,
      network: 'testnet',
      rpcUrl: 'https://soroban-testnet.stellar.org',
    });

    expect(fm.isForked).toBe(false);
    expect(fm.getForkOverrides()).toEqual({});
    expect(fm.getResourceConfig()).toBeUndefined();
    expect(fm.createSnapshotLabel()).toBe('live:testnet');
  });

  it('should not be forked when forkLedger is 0', () => {
    const fm = new ForkManager({
      forkLedger: 0,
      network: 'testnet',
      rpcUrl: 'https://soroban-testnet.stellar.org',
    });

    expect(fm.isForked).toBe(false);
  });

  it('should be forked when forkLedger is set', () => {
    const fm = new ForkManager({
      forkLedger: 12845231,
      network: 'testnet',
      rpcUrl: 'https://soroban-testnet.stellar.org',
    });

    expect(fm.isForked).toBe(true);
    expect(fm.getForkOverrides()).toEqual({ ledgerVersion: 12845231 });
    expect(fm.getResourceConfig()).toEqual({ cpuInstructions: 100_000_000, memBytes: 8_000_000 });
  });

  it('should create correct snapshot labels', () => {
    const live = new ForkManager({
      forkLedger: null, network: 'mainnet', rpcUrl: 'https://soroban-rpc.stellar.org',
    });
    expect(live.createSnapshotLabel()).toBe('live:mainnet');

    const forked = new ForkManager({
      forkLedger: 50000, network: 'futurenet', rpcUrl: 'https://rpc-futurenet.stellar.org',
    });
    expect(forked.createSnapshotLabel()).toBe('fork:futurenet@50000');
  });

  it('should return correct RPC URL and network passphrase', () => {
    const fm = new ForkManager({
      forkLedger: null,
      network: 'mainnet',
      rpcUrl: 'https://soroban-rpc.stellar.org',
    });

    expect(fm.getRpcUrl()).toBe('https://soroban-rpc.stellar.org');
    expect(fm.getNetworkPassphrase()).toBe('Public Global Stellar Network ; September 2015');
  });

  describe('validateForkLedger', () => {
    it('should accept null fork ledger', () => {
      const fm = new ForkManager({
        forkLedger: null, network: 'testnet', rpcUrl: 'https://testnet.com',
      });
      expect(fm.validateForkLedger()).toEqual({ valid: true });
    });

    it('should accept undefined fork ledger', () => {
      const fm = new ForkManager({
        forkLedger: undefined as unknown as null, network: 'testnet', rpcUrl: 'https://testnet.com',
      });
      expect(fm.validateForkLedger()).toEqual({ valid: true });
    });

    it('should accept positive integer fork ledger', () => {
      const fm = new ForkManager({
        forkLedger: 100, network: 'testnet', rpcUrl: 'https://testnet.com',
      });
      expect(fm.validateForkLedger()).toEqual({ valid: true });
    });

    it('should reject negative fork ledger', () => {
      const fm = new ForkManager({
        forkLedger: -1, network: 'testnet', rpcUrl: 'https://testnet.com',
      });
      const result = fm.validateForkLedger();
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid fork ledger');
    });

    it('should reject non-integer fork ledger', () => {
      const fm = new ForkManager({
        forkLedger: 1.5, network: 'testnet', rpcUrl: 'https://testnet.com',
      });
      const result = fm.validateForkLedger();
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid fork ledger');
    });
  });

  it('should handle all networks', () => {
    for (const network of ['mainnet', 'testnet', 'futurenet', 'local'] as const) {
      const fm = new ForkManager({
        forkLedger: null, network, rpcUrl: 'https://example.com',
      });
      expect(fm.getNetworkPassphrase()).toBeTruthy();
    }
  });
});
