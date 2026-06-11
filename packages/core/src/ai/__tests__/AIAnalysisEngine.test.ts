import { describe, it, expect, vi } from 'vitest';
import { AIAnalysisEngine } from '../AIAnalysisEngine';
import { SimulationResult, AIRequest } from '../../types';
import { BUDGET_LIMITS } from '../../constants';

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'text',
              text: 'Analysis summary\n- Suggestion one\n- Suggestion two\n\n```rust\nfn fix() {}\n```',
            },
          ],
        }),
      };
      constructor() {}
    },
  };
});

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
    raw: null,
    timestamp: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('AIAnalysisEngine', () => {
  it('should create engine without API key', () => {
    const engine = new AIAnalysisEngine();
    expect(engine.isConfigured()).toBe(false);
  });

  it('should create engine with API key', () => {
    const engine = new AIAnalysisEngine({ anthropicApiKey: 'sk-test-key' });
    expect(engine.isConfigured()).toBe(true);
  });

  it('should set API key after creation', () => {
    const engine = new AIAnalysisEngine();
    engine.setApiKey('sk-later-key');
    expect(engine.isConfigured()).toBe(true);
  });

  it('should fall back to local basic analysis without API key', async () => {
    const engine = new AIAnalysisEngine();
    const input: AIRequest = {
      simulationResult: makeResult({
        status: 'FAIL',
        error: { code: 'CONTRACT_ERROR', message: 'HostError: ContractError(1)', diagnostic: '' },
      }),
      analysisLevel: 'basic',
    };
    const response = await engine.analyze(input);

    expect(response.level).toBe('basic');
    expect(response.summary).toBeTruthy();
    expect(response.errorExplanation).toBeDefined();
  });

  it('should fall back to local deep analysis without API key', async () => {
    const engine = new AIAnalysisEngine();
    const input: AIRequest = {
      simulationResult: makeResult(),
      analysisLevel: 'deep',
    };
    const response = await engine.analyze(input);

    expect(response.level).toBe('deep');
    expect(response.optimization).toBeDefined();
  });

  it('should fall back to local audit analysis without API key', async () => {
    const engine = new AIAnalysisEngine();
    const input: AIRequest = {
      simulationResult: makeResult(),
      analysisLevel: 'audit',
    };
    const response = await engine.analyze(input);

    expect(response.level).toBe('audit');
    expect(response.summary).toContain('unavailable');
  });

  it('should use Claude API when configured', async () => {
    const engine = new AIAnalysisEngine({ anthropicApiKey: 'sk-test-key' });
    const input: AIRequest = {
      simulationResult: makeResult(),
      analysisLevel: 'basic',
    };
    const response = await engine.analyze(input);

    expect(response.summary).toBeTruthy();
    expect(response.suggestions).toBeDefined();
  });

  it('should extract code fix from markdown blocks', async () => {
    const engine = new AIAnalysisEngine({ anthropicApiKey: 'sk-test-key' });
    const input: AIRequest = {
      simulationResult: makeResult(),
      analysisLevel: 'basic',
    };
    const response = await engine.analyze(input);

    expect(response.fix).toBeDefined();
    expect(response.fix).toContain('fn fix()');
  });

  it('should handle API errors gracefully via fallback', async () => {
    const engine = new AIAnalysisEngine({ anthropicApiKey: 'sk-test-key', maxRetries: 1 });
    (engine as any).client = {
      messages: {
        create: vi.fn().mockRejectedValue(new Error('API error')),
      },
    };

    const input: AIRequest = {
      simulationResult: makeResult(),
      analysisLevel: 'basic',
    };
    const response = await engine.analyze(input);

    expect(response.summary).toBeTruthy();
  });

  it('should support static factory', async () => {
    const { createAnalysisEngine } = await import('../AIAnalysisEngine');
    const engine = createAnalysisEngine({ anthropicApiKey: 'sk-factory-key' });
    expect(engine.isConfigured()).toBe(true);
  });

  it('should create engine with custom model', () => {
    const engine = new AIAnalysisEngine({
      anthropicApiKey: 'sk-key',
      model: 'claude-sonnet-4-20250514',
      maxRetries: 5,
      requestsPerMinute: 20,
    });
    expect(engine.isConfigured()).toBe(true);
  });
});
