import { describe, it, expect } from 'vitest';
import { ErrorExplainer, createErrorExplanation } from '../ErrorExplainer';
import { SimulationResult } from '../../types';
import { BUDGET_LIMITS } from '../../constants';

function makeResult(overrides: Partial<SimulationResult> = {}): SimulationResult {
  return {
    id: 'test-id',
    status: 'FAIL',
    network: 'testnet',
    ledger: 12345,
    contractId: 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE',
    method: 'transfer',
    fee: {
      minFee: 100, maxFee: 5000, recommendedFee: 350,
      feeSurplusPercent: 50, instructions: 100000,
      maxInstructions: BUDGET_LIMITS.maxInstructions,
      readBytes: 1024, writeBytes: 512,
    },
    auth: [],
    checks: {},
    checkResults: [],
    raw: null,
    timestamp: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('ErrorExplainer', () => {
  it('should explain token ContractError(1) as insufficient balance', () => {
    const result = makeResult({
      error: { code: 'CONTRACT_ERROR', message: 'HostError: ContractError(1)', diagnostic: '' },
    });
    const explainer = new ErrorExplainer();
    const explanation = explainer.explain(result);

    expect(explanation.explanation).toContain('Insufficient balance');
    expect(explanation.remediation.length).toBeGreaterThan(0);
  });

  it('should explain token ContractError(2) as invalid amount', () => {
    const result = makeResult({
      error: { code: 'CONTRACT_ERROR', message: 'HostError: ContractError(2)', diagnostic: '' },
    });
    const explainer = new ErrorExplainer();
    const explanation = explainer.explain(result);

    expect(explanation.explanation).toContain('amount must be positive');
  });

  it('should explain token ContractError(3) as insufficient allowance', () => {
    const result = makeResult({
      error: { code: 'CONTRACT_ERROR', message: 'HostError: ContractError(3)', diagnostic: '' },
    });
    const explainer = new ErrorExplainer({ knownContracts: [{ id: 'token-id', name: 'Token', functions: ['transfer', 'approve'] }] });
    const explanation = explainer.explain(result);

    expect(explanation.explanation).toContain('Insufficient allowance');
  });

  it('should explain spot-dex ContractError(1) as insufficient liquidity', () => {
    const result = makeResult({
      contractId: 'dex-contract',
      error: { code: 'CONTRACT_ERROR', message: 'ContractError(1) - spot-dex error', diagnostic: '' },
    });
    const explainer = new ErrorExplainer();
    const explanation = explainer.explain(result);

    expect(explanation.explanation).toContain('Insufficient liquidity');
  });

  it('should handle generic HostError', () => {
    const result = makeResult({
      error: { code: 'HOST_ERROR', message: 'HostError: error occurred', diagnostic: '' },
    });
    const explanation = createErrorExplanation(result);

    expect(explanation.explanation).toContain('Host-level error');
  });

  it('should handle timeout errors', () => {
    const result = makeResult({
      status: 'ERROR',
      error: { code: 'TIMEOUT', message: 'Simulation timed out', diagnostic: '' },
    });
    const explanation = createErrorExplanation(result);

    expect(explanation.explanation).toContain('timed out');
  });

  it('should return success explanation when no error', () => {
    const result = makeResult({ status: 'SUCCESS', error: undefined });
    const explanation = createErrorExplanation(result);

    expect(explanation.explanation).toContain('No error');
  });

  it('should handle unknown error codes gracefully', () => {
    const result = makeResult({
      error: { code: 'CONTRACT_ERROR', message: 'HostError: ContractError(99)', diagnostic: '' },
    });
    const explanation = createErrorExplanation(result);

    expect(explanation.explanation).toContain('unknown error code');
  });

  it('should extract account addresses from error message', () => {
    const result = makeResult({
      error: {
        code: 'AUTH_ERROR',
        message: 'Unauthorized: GDS4N3XYQN3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5XZ3J7Z5',
        diagnostic: '',
      },
    });
    const explanation = createErrorExplanation(result);

    expect(explanation.relevantAccounts.length).toBeGreaterThan(0);
    expect(explanation.relevantAccounts[0]).toContain('GDS4');
  });

  it('should return empty result for empty error', () => {
    const result = makeResult({
      status: 'FAIL',
      error: { code: '', message: '', diagnostic: '' },
    });
    const explanation = createErrorExplanation(result);

    expect(explanation.explanation).toBeTruthy();
  });

  it('should list known contract types', () => {
    const explainer = new ErrorExplainer();
    const types = explainer.getKnownContractTypes();

    expect(types).toContain('token');
    expect(types).toContain('spot-dex');
    expect(types).toContain('atomic-swap');
  });
});
