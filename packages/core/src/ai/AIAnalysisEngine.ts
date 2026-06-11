import Anthropic from '@anthropic-ai/sdk';
import { AIRequest, AIResponse, AIAnalysisLevel, SimulationResult } from '../types';
import { ErrorExplainer } from './ErrorExplainer';
import { OptimizationAdvisor } from './OptimizationAdvisor';
import { ContractAuditor } from './ContractAuditor';
import { DEFAULT_RETRY_DELAYS } from '../constants';

export interface AIEngineOptions {
  anthropicApiKey?: string;
  model?: string;
  maxRetries?: number;
  requestsPerMinute?: number;
}

export interface PromptTemplate {
  system: string;
  user: string;
}

const PROMPT_TEMPLATES: Record<AIAnalysisLevel, PromptTemplate> = {
  basic: {
    system: `You are SoroPreFlight's AI error analysis assistant. You analyze Soroban contract simulation errors and provide clear, actionable explanations. Focus on:
- Identifying the root cause of the error
- Mentioning relevant contracts and accounts
- Providing step-by-step remediation steps
Keep responses concise and technical.`,
    user: `Analyze the following Soroban contract simulation result and explain any errors:

Simulation Status: {{status}}
Contract ID: {{contractId}}
Method: {{method}}
Error Code: {{errorCode}}
Error Message: {{errorMessage}}
Diagnostic: {{diagnostic}}

Provide a clear explanation of what went wrong and how to fix it.`,
  },
  deep: {
    system: `You are SoroPreFlight's AI optimization advisor. You analyze Soroban contract simulations and provide optimization recommendations. Focus on:
- Detecting redundant ledger reads that could be cached
- Identifying hot paths with high instruction counts
- Spotting storage access inefficiencies
- Recommending batching opportunities
- Suggesting fee optimizations
Provide specific, actionable recommendations backed by data from the simulation.`,
    user: `Analyze the following Soroban contract simulation for optimization opportunities:

Simulation Status: {{status}}
Contract ID: {{contractId}}
Method: {{method}}
Instructions Used: {{instructions}} / {{maxInstructions}}
Read Bytes: {{readBytes}}
Write Bytes: {{writeBytes}}
Fee Surplus: {{feeSurplusPercent}}%
Estimated Fee: min={{minFee}}, recommended={{recommendedFee}}, max={{maxFee}}

Check Results:
{{checkResults}}

Identify optimization opportunities in: redundant reads, hot paths, storage efficiency, batching, and fees.`,
  },
  audit: {
    system: `You are SoroPreFlight's AI contract auditor. You review Soroban smart contracts for security vulnerabilities and best practice violations. Focus on:
- Integer overflow/underflow
- Reentrancy vulnerabilities
- Access control gaps
- Economic attack surface (sandwich attacks, oracle manipulation, etc.)
- Soroban-specific best practices
- Storage schema issues
Be thorough and provide specific line-level references when possible.`,
    user: `Review the following Soroban smart contract for security vulnerabilities:

Contract ID: {{contractId}}
WASM Provided: {{hasWasm}}
Source Provided: {{hasSource}}

{{#if source}}
Source Code:
\`\`\`rust
{{source}}
\`\`\`
{{/if}}

Check for: integer overflow, reentrancy, access control issues, economic attack surface, and Soroban best practices.`,
  },
};

export class AIAnalysisEngine {
  private client: Anthropic | null = null;
  private readonly model: string;
  private readonly maxRetries: number;
  private readonly requestsPerMinute: number;
  private requestTimestamps: number[] = [];

  constructor(options: AIEngineOptions = {}) {
    if (options.anthropicApiKey) {
      this.client = new Anthropic({ apiKey: options.anthropicApiKey });
    }
    this.model = options.model || 'claude-sonnet-4-20250514';
    this.maxRetries = options.maxRetries ?? 3;
    this.requestsPerMinute = options.requestsPerMinute ?? 30;
  }

  async analyze(input: AIRequest): Promise<AIResponse> {
    const { simulationResult, analysisLevel } = input;

    if (analysisLevel === 'basic' && !this.client) {
      return this.runLocalBasic(simulationResult);
    }

    if ((analysisLevel === 'deep' || analysisLevel === 'audit') && !this.client) {
      return this.runLocalFallback(simulationResult, analysisLevel);
    }

    try {
      return await this.runWithClaude(input);
    } catch (err) {
      return this.runLocalFallback(simulationResult, analysisLevel);
    }
  }

  setApiKey(apiKey: string): void {
    this.client = new Anthropic({ apiKey });
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  private async runWithClaude(input: AIRequest): Promise<AIResponse> {
    if (!this.client) {
      return this.runLocalFallback(input.simulationResult, input.analysisLevel);
    }

    await this.rateLimit();

    const template = PROMPT_TEMPLATES[input.analysisLevel];
    const prompt = this.renderPrompt(template, input);

    const response = await this.executeWithRetry(() =>
      this.client!.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: template.system,
        messages: [{ role: 'user', content: prompt }],
      }),
    );

    return this.parseResponse(response, input);
  }

  private renderPrompt(template: PromptTemplate, input: AIRequest): string {
    const r = input.simulationResult;
    const vars: Record<string, string> = {
      status: r.status,
      contractId: r.contractId,
      method: r.method,
      errorCode: r.error?.code || 'N/A',
      errorMessage: r.error?.message || 'N/A',
      diagnostic: r.error?.diagnostic || 'N/A',
      instructions: String(r.fee.instructions),
      maxInstructions: String(r.fee.maxInstructions),
      readBytes: String(r.fee.readBytes),
      writeBytes: String(r.fee.writeBytes),
      feeSurplusPercent: String(r.fee.feeSurplusPercent.toFixed(1)),
      minFee: String(r.fee.minFee),
      recommendedFee: String(r.fee.recommendedFee),
      maxFee: String(r.fee.maxFee),
      checkResults: r.checkResults.map(c => `  [${c.status}] ${c.check}: ${c.message}`).join('\n'),
      hasWasm: input.wasm ? 'Yes' : 'No',
      hasSource: input.contractSource ? 'Yes' : 'No',
      source: input.contractSource || '',
    };

    let result = template.user;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    result = result.replace(/\{\{#if source\}\}[\s\S]*?\{\{\/if\}\}/g, input.contractSource ? vars.source : '');

    return result;
  }

  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const result = await fn();
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.maxRetries - 1) {
          const delay = DEFAULT_RETRY_DELAYS[Math.min(attempt, DEFAULT_RETRY_DELAYS.length - 1)];
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError ?? new Error('AI analysis failed after retries');
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const windowMs = 60_000;

    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < windowMs);

    if (this.requestTimestamps.length >= this.requestsPerMinute) {
      const oldest = this.requestTimestamps[0];
      const waitMs = windowMs - (now - oldest) + 100;
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }

    this.requestTimestamps.push(Date.now());
  }

  private parseResponse(response: Anthropic.Message, input: AIRequest): AIResponse {
    const content = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as Anthropic.TextBlock).text)
      .join('\n');

    const summary = this.extractSummary(content);
    const suggestions = this.extractSuggestions(content);
    const fix = this.extractFix(content);

    const base: AIResponse = {
      level: input.analysisLevel,
      summary,
      suggestions,
      fix,
    };

    if (input.analysisLevel === 'basic') {
      base.errorExplanation = {
        raw: input.simulationResult.error?.message || '',
        explanation: summary,
        remediation: suggestions,
        relevantAccounts: [],
      };
    }

    return base;
  }

  private extractSummary(content: string): string {
    const lines = content.split('\n').filter(l => l.trim());
    return lines[0] || 'Analysis completed';
  }

  private extractSuggestions(content: string): string[] {
    const suggestions: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (/^[-*]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed)) {
        suggestions.push(trimmed.replace(/^[-*\d.)\s]+/, '').trim());
      }
    }

    return suggestions.length > 0 ? suggestions : ['Review the full analysis for details'];
  }

  private extractFix(content: string): string | undefined {
    const fixMatch = content.match(/```(?:rust|solidity|typescript|javascript)?\n([\s\S]*?)```/);
    return fixMatch ? fixMatch[1].trim() : undefined;
  }

  private runLocalBasic(simulationResult: SimulationResult): AIResponse {
    const explainer = new ErrorExplainer();
    const explanation = explainer.explain(simulationResult);

    return {
      level: 'basic',
      summary: explanation.explanation,
      suggestions: explanation.remediation,
      errorExplanation: explanation,
    };
  }

  private runLocalFallback(simulationResult: SimulationResult, level: AIAnalysisLevel): AIResponse {
    const base: AIResponse = {
      level,
      summary: 'AI analysis unavailable — Claude API key not configured',
      suggestions: ['Set ANTHROPIC_API_KEY environment variable', 'Run with --analyze basic for offline error matching', 'Configure the API key in soropreflight.config.json'],
    };

    if (level === 'basic' || level === 'deep') {
      const advisor = new OptimizationAdvisor({ result: simulationResult, analysisLevel: level });
      base.optimization = advisor.analyze(simulationResult);
    }

    return base;
  }
}

export function createAnalysisEngine(options?: AIEngineOptions): AIAnalysisEngine {
  return new AIAnalysisEngine(options);
}
