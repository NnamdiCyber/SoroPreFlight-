import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SimulationEngine } from '../SimulationEngine';

vi.mock('@stellar/stellar-sdk', () => {
  const MockKeypair = {
    fromSecret: () => ({ publicKey: () => 'GDS4N3XYQN3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5' }),
    fromPublicKey: () => ({ publicKey: () => 'GDS4N3XYQN3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5' }),
  };

  return {
    rpc: {
      Server: class MockServer {
        constructor() {}
        simulateTransaction = vi.fn();
        getLatestLedger = vi.fn();
        getAccount = vi.fn();
        getHealth = vi.fn();
      },
      Api: {
        isSimulationError: () => false,
        isSimulationSuccess: () => true,
        isSimulationRestore: () => false,
        isSimulationRaw: () => false,
      },
    },
    Contract: class MockContract {
      constructor() {}
      call = () => ({} as any);
    },
    TransactionBuilder: class MockTransactionBuilder {
      constructor() { return { setTimeout: () => this, addOperation: () => this, build: () => ({}) }; }
      setTimeout = () => this;
      addOperation = () => this;
      build = () => ({}) as any;
    },
    Account: class MockAccount {
      constructor() {}
    },
    Keypair: MockKeypair,
    Transaction: class MockTransaction {},
    xdr: {
      ScVal: { scvVoid: () => ({}), scvVec: () => ({}), scvSymbol: () => ({}), scvBytes: () => ({}) },
      ScValType: { scvAddress: () => ({}), scvI128: () => ({}), scvU64: () => ({}), scvI64: () => ({}), scvU32: () => ({}), scvI32: () => ({}), scvBool: () => ({}), scvSymbol: () => ({}), scvBytes: () => ({}), scvString: () => ({}), scvVec: () => ({}), scvMap: () => ({}), scvVoid: () => ({}) },
      DiagnosticEvent: class MockDiagnosticEvent {},
      SorobanAuthorizationEntry: class MockAuthEntry {},
      Address: class MockAddress {},
    },
    nativeToScVal: (val: any) => ({} as any),
  };
});

const VALID_CONTRACT_ID = 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE';
const VALID_SOURCE = 'GDS4N3XYQN3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5';

describe('SimulationEngine', () => {
  let engine: SimulationEngine;

  beforeEach(() => {
    engine = new SimulationEngine({
      network: 'testnet',
      rpcUrl: 'https://soroban-testnet.stellar.org',
      networkPassphrase: 'Test SDF Network ; September 2015',
      timeout: 5000,
      maxRetries: 1,
    });

    const server = engine.getServer() as any;
    server.getLatestLedger.mockResolvedValue({
      sequence: 12845231,
      id: 'abc',
      protocolVersion: '20',
    });
  });

  describe('constructor', () => {
    it('should create an instance with default options', () => {
      expect(engine).toBeInstanceOf(SimulationEngine);
      expect(engine.getServer()).toBeDefined();
      expect(engine.getForkManager()).toBeDefined();
      expect(engine.getResourceEstimator()).toBeDefined();
    });

    it('should be created via static factory', () => {
      const e = SimulationEngine.create({
        network: 'testnet',
        rpcUrl: 'https://soroban-testnet.stellar.org',
        networkPassphrase: 'Test SDF Network ; September 2015',
      });
      expect(e).toBeInstanceOf(SimulationEngine);
    });
  });

  describe('error handling', () => {
    it('should handle simulation timeout error', async () => {
      const server = engine.getServer() as any;
      server.simulateTransaction.mockRejectedValue(
        new Error('Simulation timed out after 5000ms'),
      );

      const result = await engine.simulate({
        contractId: VALID_CONTRACT_ID,
        method: 'increment',
        args: [],
        sourceAccount: VALID_SOURCE,
      });

      expect(result.status).toBe('ERROR');
      expect(result.error?.code).toBe('TIMEOUT');
    });

    it('should handle network error', async () => {
      const server = engine.getServer() as any;
      server.simulateTransaction.mockRejectedValue(
        new Error('ECONNREFUSED: connection refused'),
      );

      const result = await engine.simulate({
        contractId: VALID_CONTRACT_ID,
        method: 'increment',
        args: [],
        sourceAccount: VALID_SOURCE,
      });

      expect(result.status).toBe('ERROR');
      expect(result.error?.code).toBe('NETWORK_ERROR');
    });

    it('should handle contract error', async () => {
      const server = engine.getServer() as any;
      server.simulateTransaction.mockRejectedValue(
        new Error('HostError: ContractError(1)'),
      );

      const result = await engine.simulate({
        contractId: VALID_CONTRACT_ID,
        method: 'increment',
        args: [],
        sourceAccount: VALID_SOURCE,
      });

      expect(result.status).toBe('ERROR');
      expect(result.error?.code).toBe('CONTRACT_ERROR');
    });

    it('should handle unknown errors', async () => {
      const server = engine.getServer() as any;
      server.simulateTransaction.mockRejectedValue(
        new Error('Something unexpected happened'),
      );

      const result = await engine.simulate({
        contractId: VALID_CONTRACT_ID,
        method: 'increment',
        args: [],
        sourceAccount: VALID_SOURCE,
      });

      expect(result.status).toBe('ERROR');
      expect(result.error?.code).toBe('UNKNOWN_ERROR');
    });
  });

  it('should produce consistent result shape on error', async () => {
    const server = engine.getServer() as any;
    server.simulateTransaction.mockRejectedValue(
      new Error('test error'),
    );

    const result = await engine.simulate({
      contractId: VALID_CONTRACT_ID,
      method: 'increment',
      args: [],
      sourceAccount: VALID_SOURCE,
    });

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('network');
    expect(result).toHaveProperty('contractId');
    expect(result).toHaveProperty('method');
    expect(result).toHaveProperty('fee');
    expect(result).toHaveProperty('auth');
    expect(result).toHaveProperty('raw');
    expect(result).toHaveProperty('timestamp');
  });
});
