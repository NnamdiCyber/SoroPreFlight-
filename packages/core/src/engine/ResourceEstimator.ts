import { FeeEstimate } from '../types';
import { BUDGET_LIMITS } from '../constants';

export interface SimulationCosts {
  cpuInsns: number;
  memBytes: number;
}

export interface ResourceEstimatorInput {
  cost: SimulationCosts;
  minResourceFee: string;
  readBytes: number;
  writeBytes: number;
  ledgerEntryReads?: number;
  ledgerEntryWrites?: number;
}

export interface ResourceEstimate {
  instructions: number;
  maxInstructions: number;
  instructionUtilization: number;
  readBytes: number;
  writeBytes: number;
  minFee: number;
  maxFee: number;
  recommendedFee: number;
  feeSurplusPercent: number;
  baseFee: number;
  resourceFee: number;
  totalFee: number;
}

export class ResourceEstimator {
  private readonly baseFee: number;

  constructor(baseFee: number = BUDGET_LIMITS.defaultFee) {
    this.baseFee = baseFee;
  }

  estimate(input: ResourceEstimatorInput): ResourceEstimate {
    const instructions = input.cost.cpuInsns;
    const maxInstructions = BUDGET_LIMITS.maxInstructions;
    const instructionUtilization = instructions / maxInstructions;

    const readBytes = input.readBytes;
    const writeBytes = input.writeBytes;
    const resourceFee = this.computeResourceFee(instructions, readBytes, writeBytes, input.minResourceFee);
    const minFee = this.baseFee + resourceFee;
    const recommendedFee = this.computeRecommendedFee(minFee, instructions);
    const maxFee = this.computeMaxFee(recommendedFee);

    return {
      instructions,
      maxInstructions,
      instructionUtilization,
      readBytes,
      writeBytes,
      minFee,
      maxFee,
      recommendedFee,
      feeSurplusPercent: this.computeFeeSurplusPercent(minFee, recommendedFee),
      baseFee: this.baseFee,
      resourceFee,
      totalFee: recommendedFee,
    };
  }

  estimateToFeeEstimate(estimate: ResourceEstimate): FeeEstimate {
    return {
      minFee: estimate.minFee,
      maxFee: estimate.maxFee,
      recommendedFee: estimate.recommendedFee,
      feeSurplusPercent: estimate.feeSurplusPercent,
      instructions: estimate.instructions,
      maxInstructions: estimate.maxInstructions,
      readBytes: estimate.readBytes,
      writeBytes: estimate.writeBytes,
    };
  }

  private computeResourceFee(
    instructions: number,
    readBytes: number,
    writeBytes: number,
    minResourceFeeStr: string,
  ): number {
    const parsedMinFee = parseInt(minResourceFeeStr, 10);
    if (!Number.isNaN(parsedMinFee) && parsedMinFee > 0) {
      return parsedMinFee;
    }

    const instructionFee = Math.ceil(instructions * 0.0001);
    const readFee = Math.ceil(readBytes * 0.001);
    const writeFee = Math.ceil(writeBytes * 0.005);
    return instructionFee + readFee + writeFee;
  }

  private computeRecommendedFee(minFee: number, instructions: number): number {
    const surplus = Math.max(minFee * BUDGET_LIMITS.feeSurplusMinimum, instructions * 0.00005);
    return Math.ceil(minFee + surplus);
  }

  private computeMaxFee(recommendedFee: number): number {
    return Math.ceil(recommendedFee * 3);
  }

  private computeFeeSurplusPercent(minFee: number, recommendedFee: number): number {
    if (minFee === 0) return 0;
    return ((recommendedFee - minFee) / minFee) * 100;
  }

  hasSufficientSurplus(feeSurplusPercent: number): boolean {
    return feeSurplusPercent >= BUDGET_LIMITS.feeSurplusMinimum * 100;
  }

  isWithinBudget(instructions: number): boolean {
    return instructions < BUDGET_LIMITS.maxInstructions * BUDGET_LIMITS.instructionWarningThreshold;
  }
}
