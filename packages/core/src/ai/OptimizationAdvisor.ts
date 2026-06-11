import { SimulationResult, OptimizationAdvice, AIAnalysisLevel } from '../types';

export interface OptimizationAdvisorInput {
  result: SimulationResult;
  analysisLevel: AIAnalysisLevel;
}

export class OptimizationAdvisor {
  private readonly analysisLevel: AIAnalysisLevel;

  constructor(input: OptimizationAdvisorInput) {
    this.analysisLevel = input.analysisLevel;
  }

  analyze(result: SimulationResult): OptimizationAdvice {
    const advice: OptimizationAdvice = {
      redundantReads: [],
      hotPaths: [],
      storageInefficiencies: [],
      batchingOpportunities: [],
      feeOptimization: [],
    };

    if (result.status !== 'SUCCESS') {
      return advice;
    }

    this.detectRedundantReads(result, advice);
    this.detectHotPaths(result, advice);
    this.detectStorageInefficiencies(result, advice);
    this.detectBatchingOpportunities(result, advice);
    this.analyzeFees(result, advice);

    return advice;
  }

  private detectRedundantReads(result: SimulationResult, advice: OptimizationAdvice): void {
    const raw = result.raw as Record<string, unknown> | null;

    const stateChanges = raw?.['stateChanges'] as Array<Record<string, unknown>> | undefined;
    if (!stateChanges || stateChanges.length === 0) {
      return;
    }

    const readKeys = stateChanges
      .filter(c => (c['type'] as string) === 'read')
      .map(c => c['key'] as string)
      .filter(Boolean);

    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const key of readKeys) {
      if (seen.has(key)) {
        duplicates.add(key);
      }
      seen.add(key);
    }

    if (duplicates.size > 0) {
      for (const key of duplicates) {
        advice.redundantReads.push(`Ledger key "${key}" was read multiple times. Consider caching the value after the first read.`);
      }
    }

    if (readKeys.length > 20) {
      advice.redundantReads.push(
        `Contract reads ${readKeys.length} distinct ledger entries in a single operation. Consider reducing the footprint by reading only what is necessary.`,
      );
    }
  }

  private detectHotPaths(result: SimulationResult, advice: OptimizationAdvice): void {
    const instructions = result.fee.instructions;
    const maxInstructions = result.fee.maxInstructions;

    if (instructions > maxInstructions * 0.5) {
      advice.hotPaths.push(
        `High instruction usage: ${instructions.toLocaleString()} instructions (${(instructions / maxInstructions * 100).toFixed(1)}% of max). This is a potential hot path.`,
      );
    }

    if (instructions > maxInstructions * 0.3) {
      advice.hotPaths.push(
        `Consider optimizing loops or recursive calls — instruction count (${instructions.toLocaleString()}) indicates significant computation.`,
      );
    }

    const readBytes = result.fee.readBytes;
    if (readBytes > 100_000) {
      advice.hotPaths.push(
        `Large read footprint: ${readBytes.toLocaleString()} bytes. This may indicate scanning over many ledger entries.`,
      );
    }
  }

  private detectStorageInefficiencies(result: SimulationResult, advice: OptimizationAdvice): void {
    const writeBytes = result.fee.writeBytes;
    const readBytes = result.fee.readBytes;

    const ratio = readBytes > 0 ? writeBytes / readBytes : 0;
    if (ratio > 2) {
      advice.storageInefficiencies.push(
        `Write-to-read ratio is high (${(ratio).toFixed(1)}x). Consider whether all written data is necessary.`,
      );
    }

    const raw = result.raw as Record<string, unknown> | null;
    const stateChanges = raw?.['stateChanges'] as Array<Record<string, unknown>> | undefined;
    if (stateChanges) {
      const writtenChanges = stateChanges.filter(c => (c['type'] as string) === 'written' || (c['type'] as string) === 'created');
      if (writtenChanges.length > 5) {
        advice.storageInefficiencies.push(
          `Writing to ${writtenChanges.length} separate entries in one operation. Consider consolidating related state.`,
        );
      }
    }

    if (writeBytes > 50_000) {
      advice.storageInefficiencies.push(
        `Large write payload: ${writeBytes.toLocaleString()} bytes. Consider whether all fields need updating.`,
      );
    }
  }

  private detectBatchingOpportunities(result: SimulationResult, advice: OptimizationAdvice): void {
    const raw = result.raw as Record<string, unknown> | null;
    const stateChanges = raw?.['stateChanges'] as Array<Record<string, unknown>> | undefined;

    if (stateChanges) {
      const readKeys = stateChanges
        .filter(c => (c['type'] as string) === 'read')
        .map(c => c['key'] as string)
        .filter(Boolean);

      if (readKeys.length > 10) {
        advice.batchingOpportunities.push(
          `Batch reads: ${readKeys.length} entries are read. If these are in a ledger range, consider a bulk read approach.`,
        );
      }
    }

    const utilization = result.fee.maxInstructions > 0
      ? result.fee.instructions / result.fee.maxInstructions
      : 0;

    if (utilization < 0.1) {
      advice.batchingOpportunities.push(
        `Low instruction utilization (${(utilization * 100).toFixed(1)}%). Consider batching multiple operations into a single transaction.`,
      );
    }
  }

  private analyzeFees(result: SimulationResult, advice: OptimizationAdvice): void {
    const surplus = result.fee.feeSurplusPercent;

    if (surplus > 100) {
      advice.feeOptimization.push(
        `Fee surplus is very high (${surplus.toFixed(0)}%). Consider reducing the base fee to save on transaction costs.`,
      );
    }

    if (surplus < 20) {
      advice.feeOptimization.push(
        `Fee surplus is below 20% (${surplus.toFixed(1)}%). Increase the fee buffer to reduce risk of failed transactions.`,
      );
    }

    const maxFee = result.fee.maxFee;
    if (maxFee > 1_000_000) {
      advice.feeOptimization.push(
        `Maximum fee (${maxFee.toLocaleString()}) is relatively high. Consider if this is acceptable for the operation.`,
      );
    }
  }
}

export function createOptimizationAdvice(result: SimulationResult, level: AIAnalysisLevel = 'basic'): OptimizationAdvice {
  const advisor = new OptimizationAdvisor({ result, analysisLevel: level });
  return advisor.analyze(result);
}
