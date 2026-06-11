import { ContractAudit, Vulnerability, AIAnalysisLevel } from '../types';

export interface ContractAuditorInput {
  wasm?: string;
  source?: string;
  analysisLevel: AIAnalysisLevel;
  contractId?: string;
}

export class ContractAuditor {
  private readonly input: ContractAuditorInput;

  constructor(input: ContractAuditorInput) {
    this.input = input;
  }

  audit(): ContractAudit {
    const vulnerabilities: Vulnerability[] = [];
    const accessControlIssues: string[] = [];
    const economicAttackSurface: string[] = [];
    const bestPracticeViolations: string[] = [];

    if (this.input.source) {
      this.analyzeSource(this.input.source, vulnerabilities, accessControlIssues, economicAttackSurface, bestPracticeViolations);
    }

    if (this.input.wasm && !this.input.source) {
      bestPracticeViolations.push('Source code not provided — analysis is limited without the contract source');
    }

    if (!this.input.wasm && !this.input.source) {
      bestPracticeViolations.push('No contract code provided for audit — provide WASM and/or source for meaningful analysis');
    }

    const overallRisk = this.computeOverallRisk(vulnerabilities);

    return {
      vulnerabilities,
      accessControlIssues,
      economicAttackSurface,
      bestPracticeViolations,
      overallRisk,
    };
  }

  private analyzeSource(
    source: string,
    vulnerabilities: Vulnerability[],
    accessControlIssues: string[],
    economicAttackSurface: string[],
    bestPracticeViolations: string[],
  ): void {
    this.checkIntegerOverflow(source, vulnerabilities);
    this.checkReentrancy(source, vulnerabilities);
    this.checkAccessControl(source, accessControlIssues);
    this.checkEconomicAttacks(source, economicAttackSurface);
    this.checkBestPractices(source, bestPracticeViolations);
  }

  private checkIntegerOverflow(source: string, vulnerabilities: Vulnerability[]): void {
    const concerns: { pattern: RegExp; description: string; location?: string }[] = [
      { pattern: /\b(\w+)\s*[+\-*/]\s*=\s*\1\s*[+\-*/]\s*\d+\b/g, description: 'Unchecked arithmetic operation may overflow' },
      { pattern: /\bu64\b[^;]*[+\-*]/g, description: 'u64 arithmetic without overflow checks' },
      { pattern: /\bi128\b[^;]*[+\-*]/g, description: 'i128 arithmetic without overflow checks' },
      { pattern: /\b(\w+)\s*=\s*\1\s*\+\s*1\b/g, description: 'Increment operation — consider using checked_add for overflow safety' },
    ];

    this.findCodeConcerns(source, concerns, vulnerabilities, 'integer-overflow');
  }

  private checkReentrancy(source: string, vulnerabilities: Vulnerability[]): void {
    const concerns: { pattern: RegExp; description: string }[] = [
      { pattern: /(\w+)\.(\w+)\s*\([^)]*\)\s*;?\s*[^}]*\1\.\2/g, description: 'Potential reentrancy — external call made before state update' },
      { pattern: /call\s*\([^)]*\)/g, description: 'External contract calls may introduce reentrancy if state is modified after the call' },
      { pattern: /transfer\s*\([^)]*\)\s*;?\s*[^;]*balance/g, description: 'Balance update after transfer — potential reentrancy pattern' },
    ];

    this.findCodeConcerns(source, concerns, vulnerabilities, 'reentrancy');
  }

  private checkAccessControl(source: string, accessControlIssues: string[]): void {
    if (!/\brequire\s*\([^)]*\)/g.test(source)) {
      accessControlIssues.push('No require() statements found — contract may lack access control checks entirely');
    }

    if (!/require\s*\(\s*[^)]*admin|owner|auth|signer[^)]*\)/gi.test(source)) {
      accessControlIssues.push('No admin/owner authorization checks found — sensitive functions may be publicly accessible');
    }

    const fnMatches = source.match(/fn\s+(\w+)\s*\([^)]*\)/g);
    if (fnMatches) {
      for (const fn of fnMatches) {
        const fnName = fn.match(/fn\s+(\w+)/)?.[1];
        if (fnName && !fnName.startsWith('_') && fnName !== 'init' && fnName !== '__constructor') {
          const fnBlock = this.extractFunctionBlock(source, fnName);
          if (fnBlock && !fnBlock.includes('require') && !fnBlock.includes('check_auth')) {
            accessControlIssues.push(`Function "${fnName}" has no access control checks`);
          }
        }
      }
    }
  }

  private checkEconomicAttacks(source: string, economicAttackSurface: string[]): void {
    if (/\bprice|rate|swap|exchange\b/i.test(source)) {
      if (!/\bslippage|min_out|max_in|tolerance\b/i.test(source)) {
        economicAttackSurface.push('Price-related operations without slippage protection — vulnerable to sandwich attacks');
      }
    }

    if (/\bdeposit|stake|lend\b/i.test(source)) {
      if (!/\btotal_supply|exchange_rate|share\b/i.test(source)) {
        economicAttackSurface.push('Deposit/stake operations without inflation protection — early depositors may lose value');
      }
    }

    if (/\bflash.loan|donate|repay\b/i.test(source)) {
      economicAttackSurface.push('Flash loan patterns detected — ensure callback safety and oracle freshness');
    }

    const oraclePatterns = /\boracle|price.feed\b/i.test(source);
    if (oraclePatterns && !/\btwap|median|multiple\b/i.test(source)) {
      economicAttackSurface.push('Single oracle dependency detected — use TWAP or multi-source aggregation');
    }
  }

  private checkBestPractices(source: string, bestPracticeViolations: string[]): void {
    if (/\bunwrap\b/.test(source) && !/unwrap_checked\b/.test(source)) {
      bestPracticeViolations.push('Use unwrap_checked() instead of unwrap() to avoid panics on unexpected state');
    }

    if (/panic!\(/.test(source)) {
      bestPracticeViolations.push('Contract uses panic!() — consider returning proper error codes instead');
    }

    if (!/\/\/\/\s*(?:Safety|Arguments|Returns)/i.test(source) && source.length > 1000) {
      bestPracticeViolations.push('Missing documentation comments (/// Safety, Arguments, Returns) on public functions');
    }

    if (!/\benv::current\(\)/.test(source)) {
      bestPracticeViolations.push('Contract does not reference env::current() — may not be a valid Soroban contract');
    }

    if (/\btest\b/.test(source) && !/test.*mod|#\[test\]/i.test(source)) {
      bestPracticeViolations.push('Test module not found — consider adding unit tests for contract functions');
    }

    if (source.length > 50_000) {
      bestPracticeViolations.push(`Contract source is large (${source.length} bytes) — consider modularizing into separate files`);
    }
  }

  private findCodeConcerns(
    source: string,
    concerns: { pattern: RegExp; description: string; location?: string }[],
    vulnerabilities: Vulnerability[],
    type: string,
  ): void {
    for (const concern of concerns) {
      const matches = source.match(concern.pattern);
      if (matches) {
        const lineNumbers = this.findLineNumbers(source, concern.pattern);
        const loc = lineNumbers ? `line ${lineNumbers[0]}` : undefined;
        vulnerabilities.push({
          type,
          severity: type === 'integer-overflow' ? 'high' : 'medium',
          location: loc,
          description: concern.description,
          remediation: this.getRemediationForType(type),
        });
      }
    }
  }

  private findLineNumbers(source: string, pattern: RegExp): number[] | undefined {
    const lines: number[] = [];
    const srcLines = source.split('\n');
    const re = new RegExp(pattern.source, pattern.flags);
    for (let i = 0; i < srcLines.length; i++) {
      if (re.test(srcLines[i])) {
        lines.push(i + 1);
      }
    }
    return lines.length > 0 ? lines : undefined;
  }

  private extractFunctionBlock(source: string, fnName: string): string | null {
    const match = source.match(new RegExp(`fn\\s+${fnName}\\s*\\([^)]*\\)\\s*[\\s\\S]*?\\{([\\s\\S]*?)\\n\\}`));
    return match ? match[1] : null;
  }

  private getRemediationForType(type: string): string {
    switch (type) {
      case 'integer-overflow':
        return 'Use checked arithmetic (checked_add, checked_mul) or verify inputs to prevent overflow';
      case 'reentrancy':
        return 'Apply the checks-effects-interactions pattern — update state before making external calls';
      default:
        return 'Review the identified pattern and apply appropriate mitigation';
    }
  }

  private computeOverallRisk(vulnerabilities: Vulnerability[]): 'low' | 'medium' | 'high' | 'critical' {
    if (vulnerabilities.some(v => v.severity === 'critical')) return 'critical';
    if (vulnerabilities.some(v => v.severity === 'high')) return 'high';
    if (vulnerabilities.some(v => v.severity === 'medium')) return 'medium';
    return 'low';
  }
}

export function createContractAudit(
  wasm?: string,
  source?: string,
  level: AIAnalysisLevel = 'audit',
  contractId?: string,
): ContractAudit {
  const auditor = new ContractAuditor({ wasm, source, analysisLevel: level, contractId });
  return auditor.audit();
}
