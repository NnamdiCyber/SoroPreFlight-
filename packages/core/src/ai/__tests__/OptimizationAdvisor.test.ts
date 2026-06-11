import { describe, it, expect } from 'vitest';
import { OptimizationAdvisor, createOptimizationAdvice } from '../OptimizationAdvisor';
import { SimulationResult } from '../../types';
import { BUDGET_LIMITS } from '../../constants';

function makeResult(overrides: Partial<SimulationResult> = {}): SimulationResult {
  return {
    id: 'test-id',
    status: 'SUCCESS',
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
    raw: {
      stateChanges: [
        { key: 'balance:user1', type: 'read' },
        { key: 'balance:user2', type: 'read' },
        { key: 'balance:user1', type: 'written' },
      ],
    },
    timestamp: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('OptimizationAdvisor', () => {
  it('should return advice for a successful simulation', () => {
    const result = makeResult();
    const advice = createOptimizationAdvice(result);

    expect(advice).toHaveProperty('redundantReads');
    expect(advice).toHaveProperty('hotPaths');
    expect(advice).toHaveProperty('storageInefficiencies');
    expect(advice).toHaveProperty('batchingOpportunities');
    expect(advice).toHaveProperty('feeOptimization');
  });

  it('should detect redundant reads from state changes', () => {
    const result = makeResult({
      raw: {
        stateChanges: [
          { key: 'balance:alice', type: 'read' },
          { key: 'balance:alice', type: 'read' },
          { key: 'balance:bob', type: 'read' },
        ],
      },
    });
    const advice = createOptimizationAdvice(result);

    expect(advice.redundantReads.length).toBeGreaterThanOrEqual(1);
    expect(advice.redundantReads.some(r => r.includes('balance:alice'))).toBe(true);
  });

  it('should flag high instruction usage', () => {
    const result = makeResult({
      fee: { ...makeResult().fee, instructions: Math.floor(BUDGET_LIMITS.maxInstructions * 0.6) },
    });
    const advice = createOptimizationAdvice(result);

    expect(advice.hotPaths.length).toBeGreaterThanOrEqual(1);
    expect(advice.hotPaths.some(h => h.includes('High instruction'))).toBe(true);
  });

  it('should flag high write-to-read ratio', () => {
    const result = makeResult({
      fee: { ...makeResult().fee, readBytes: 1000, writeBytes: 5000 },
    });
    const advice = createOptimizationAdvice(result);

    expect(advice.storageInefficiencies.length).toBeGreaterThanOrEqual(1);
  });

  it('should flag many state writes', () => {
    const result = makeResult({
      raw: {
        stateChanges: [
          { key: 'k1', type: 'written' },
          { key: 'k2', type: 'written' },
          { key: 'k3', type: 'written' },
          { key: 'k4', type: 'written' },
          { key: 'k5', type: 'written' },
          { key: 'k6', type: 'written' },
        ],
      },
    });
    const advice = createOptimizationAdvice(result);

    expect(advice.storageInefficiencies.some(s => s.includes('Writing'))).toBe(true);
  });

  it('should suggest batching for low instruction utilization', () => {
    const result = makeResult({
      fee: { ...makeResult().fee, instructions: 1000 },
    });
    const advice = createOptimizationAdvice(result);

    expect(advice.batchingOpportunities.some(b => b.includes('Low instruction'))).toBe(true);
  });

  it('should suggest fee optimization for high surplus', () => {
    const result = makeResult({
      fee: { ...makeResult().fee, feeSurplusPercent: 150 },
    });
    const advice = createOptimizationAdvice(result);

    expect(advice.feeOptimization.some(f => f.includes('very high'))).toBe(true);
  });

  it('should suggest fee optimization for low surplus', () => {
    const result = makeResult({
      fee: { ...makeResult().fee, feeSurplusPercent: 10 },
    });
    const advice = createOptimizationAdvice(result);

    expect(advice.feeOptimization.some(f => f.includes('below 20%'))).toBe(true);
  });

  it('should return empty arrays for non-success simulation', () => {
    const result = makeResult({ status: 'ERROR', error: { code: 'ERR', message: 'err' } });
    const advice = createOptimizationAdvice(result);

    expect(advice.redundantReads).toHaveLength(0);
    expect(advice.hotPaths).toHaveLength(0);
  });

  it('should return advice via instance', () => {
    const result = makeResult();
    const advisor = new OptimizationAdvisor({ result, analysisLevel: 'deep' });
    const advice = advisor.analyze(result);

    expect(advice.redundantReads).toBeDefined();
  });
});
