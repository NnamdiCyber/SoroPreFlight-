import { describe, it, expect } from 'vitest';
import { ResourceEstimator } from '../ResourceEstimator';

describe('ResourceEstimator', () => {
  const estimator = new ResourceEstimator(100);

  it('should estimate resources for a basic simulation', () => {
    const estimate = estimator.estimate({
      cost: { cpuInsns: 142880, memBytes: 4096 },
      minResourceFee: '',
      readBytes: 2304,
      writeBytes: 512,
    });

    expect(estimate.instructions).toBe(142880);
    expect(estimate.maxInstructions).toBe(100_000_000);
    expect(estimate.instructionUtilization).toBeCloseTo(0.0014288, 6);
    expect(estimate.readBytes).toBe(2304);
    expect(estimate.writeBytes).toBe(512);
    expect(estimate.minFee).toBeGreaterThan(0);
    expect(estimate.recommendedFee).toBeGreaterThan(estimate.minFee);
    expect(estimate.maxFee).toBeGreaterThan(estimate.recommendedFee);
    expect(estimate.resourceFee).toBeGreaterThan(0);
    expect(estimate.totalFee).toBe(estimate.recommendedFee);
  });

  it('should parse minResourceFee from string', () => {
    const estimate = estimator.estimate({
      cost: { cpuInsns: 100000, memBytes: 2048 },
      minResourceFee: '5000',
      readBytes: 1024,
      writeBytes: 256,
    });

    expect(estimate.resourceFee).toBe(5000);
    expect(estimate.minFee).toBe(100 + 5000);
  });

  it('should compute fee surplus percentage correctly', () => {
    const lowEstimate = estimator.estimate({
      cost: { cpuInsns: 1000, memBytes: 128 },
      minResourceFee: '100',
      readBytes: 100,
      writeBytes: 50,
    });

    expect(lowEstimate.feeSurplusPercent).toBeGreaterThan(0);
  });

  it('should detect sufficient fee surplus', () => {
    expect(estimator.hasSufficientSurplus(30)).toBe(true);
    expect(estimator.hasSufficientSurplus(10)).toBe(false);
  });

  it('should detect when within budget', () => {
    expect(estimator.isWithinBudget(50_000_000)).toBe(true);
    expect(estimator.isWithinBudget(99_000_000)).toBe(false);
  });

  it('should convert ResourceEstimate to FeeEstimate', () => {
    const estimate = estimator.estimate({
      cost: { cpuInsns: 100000, memBytes: 2048 },
      minResourceFee: '1000',
      readBytes: 512,
      writeBytes: 128,
    });

    const feeEstimate = estimator.estimateToFeeEstimate(estimate);

    expect(feeEstimate.minFee).toBe(estimate.minFee);
    expect(feeEstimate.maxFee).toBe(estimate.maxFee);
    expect(feeEstimate.recommendedFee).toBe(estimate.recommendedFee);
    expect(feeEstimate.feeSurplusPercent).toBe(estimate.feeSurplusPercent);
    expect(feeEstimate.instructions).toBe(estimate.instructions);
    expect(feeEstimate.maxInstructions).toBe(estimate.maxInstructions);
    expect(feeEstimate.readBytes).toBe(estimate.readBytes);
    expect(feeEstimate.writeBytes).toBe(estimate.writeBytes);
  });

  it('should handle zero costs gracefully', () => {
    const estimate = estimator.estimate({
      cost: { cpuInsns: 0, memBytes: 0 },
      minResourceFee: '0',
      readBytes: 0,
      writeBytes: 0,
    });

    expect(estimate.instructions).toBe(0);
    expect(estimate.minFee).toBe(100);
    expect(estimate.resourceFee).toBe(0);
    expect(estimate.feeSurplusPercent).toBeGreaterThanOrEqual(0);
  });

  it('should compute fees with large values', () => {
    const estimate = estimator.estimate({
      cost: { cpuInsns: 50_000_000, memBytes: 4_000_000 },
      minResourceFee: '',
      readBytes: 100_000,
      writeBytes: 50_000,
    });

    expect(estimate.instructions).toBe(50_000_000);
    expect(estimate.minFee).toBeGreaterThan(100);
    expect(estimate.maxFee).toBeGreaterThan(estimate.recommendedFee);
    expect(estimate.instructionUtilization).toBeCloseTo(0.5, 2);
  });
});
