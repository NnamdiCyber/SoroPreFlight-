import chalk from 'chalk';
import Table from 'cli-table3';
import type {
  SimulationResult,
  DeployResult,
  CheckResult,
  FeeEstimate,
  AuthResult,
  AIResponse,
  CheckStatus,
} from '@soropreflight/sdk';
import type { BatchResult, SuiteResult } from '@soropreflight/sdk';

export type ReportType = 'simulate' | 'deploy' | 'batch' | 'suite';

export interface ReportOptions {
  format: 'terminal' | 'json' | 'html';
  outputDir?: string;
}

function statusIcon(status: CheckStatus): string {
  switch (status) {
    case 'PASS': return chalk.green('\u2713');
    case 'FAIL': return chalk.red('\u2717');
    case 'WARN': return chalk.yellow('\u26A0');
    case 'SKIP': return chalk.dim('\u2014');
  }
}

function resultStatusIcon(status: string): string {
  switch (status) {
    case 'SUCCESS': return chalk.green('\u2713');
    case 'FAIL': return chalk.red('\u2717');
    case 'ERROR': return chalk.red('\u26A0');
    case 'ALL_PASS': return chalk.green('\u2713');
    case 'PARTIAL_FAIL': return chalk.yellow('\u26A0');
    case 'ALL_FAIL': return chalk.red('\u2717');
    default: return chalk.dim('?');
  }
}

export function formatSimulationResult(result: SimulationResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(chalk.bold('Simulation Result'));
  lines.push(chalk.dim('\u2500'.repeat(60)));

  const mainTable = new Table({
    style: { head: [], border: [] },
    colWidths: [20, 40],
  });

  mainTable.push(
    [chalk.bold('Contract'), result.contractId],
    [chalk.bold('Function'), result.method],
    [chalk.bold('Network'), result.network],
    [chalk.bold('Ledger'), String(result.ledger)],
    [chalk.bold('Status'), `${resultStatusIcon(result.status)} ${result.status}`],
  );

  lines.push(mainTable.toString());

  lines.push('');
  lines.push(chalk.bold('Fee Estimate'));
  lines.push(chalk.dim('\u2500'.repeat(60)));
  lines.push(formatFeeEstimate(result.fee));

  if (result.auth && result.auth.length > 0) {
    lines.push('');
    lines.push(chalk.bold('Authorization'));
    lines.push(chalk.dim('\u2500'.repeat(60)));
    lines.push(formatAuthResults(result.auth));
  }

  if (result.checkResults && result.checkResults.length > 0) {
    lines.push('');
    lines.push(chalk.bold('Pre-flight Checks'));
    lines.push(chalk.dim('\u2500'.repeat(60)));
    lines.push(formatCheckResults(result.checkResults));
  }

  if (result.ai) {
    lines.push('');
    lines.push(chalk.bold('AI Analysis'));
    lines.push(chalk.dim('\u2500'.repeat(60)));
    lines.push(formatAIResponse(result.ai));
  }

  if (result.error) {
    lines.push('');
    lines.push(chalk.bold(chalk.red('Error')));
    lines.push(chalk.dim('\u2500'.repeat(60)));
    lines.push(chalk.red(`[${result.error.code}] ${result.error.message}`));
    if (result.error.diagnostic) {
      lines.push(chalk.dim(result.error.diagnostic));
    }
  }

  lines.push('');
  lines.push(chalk.dim(`Report ID: ${result.id}`));
  lines.push(chalk.dim(`Timestamp: ${result.timestamp}`));

  return lines.join('\n');
}

export function formatDeployResult(result: DeployResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(chalk.bold('Deploy Simulation'));
  lines.push(chalk.dim('\u2500'.repeat(60)));

  const mainTable = new Table({
    style: { head: [], border: [] },
    colWidths: [20, 40],
  });

  mainTable.push(
    [chalk.bold('Status'), `${resultStatusIcon(result.status)} ${result.status}`],
    [chalk.bold('WASM Hash'), result.wasmHash],
  );

  if (result.contractId) {
    mainTable.push([chalk.bold('Contract ID'), result.contractId]);
  }

  lines.push(mainTable.toString());

  if (result.checkResults && result.checkResults.length > 0) {
    lines.push('');
    lines.push(chalk.bold('Deploy Checks'));
    lines.push(chalk.dim('\u2500'.repeat(60)));
    lines.push(formatCheckResults(result.checkResults));
  }

  if (result.ai) {
    lines.push('');
    lines.push(chalk.bold('AI Analysis'));
    lines.push(chalk.dim('\u2500'.repeat(60)));
    lines.push(formatAIResponse(result.ai));
  }

  if (result.error) {
    lines.push('');
    lines.push(chalk.red(`[${result.error.code}] ${result.error.message}`));
  }

  return lines.join('\n');
}

export function formatBatchResult(result: BatchResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(chalk.bold('Batch Simulation'));
  lines.push(chalk.dim('\u2500'.repeat(60)));

  const total = result.results.length;
  const passed = result.results.filter(r => r.status === 'SUCCESS').length;
  const failed = total - passed;

  const summaryTable = new Table({
    style: { head: [], border: [] },
    colWidths: [20, 40],
  });

  summaryTable.push(
    [chalk.bold('Status'), `${resultStatusIcon(result.status)} ${result.status}`],
    [chalk.bold('Total'), String(total)],
    [chalk.bold('Passed'), chalk.green(String(passed))],
    [chalk.bold('Failed'), failed > 0 ? chalk.red(String(failed)) : String(failed)],
  );

  if (result.collisions.length > 0) {
    summaryTable.push([chalk.bold('Collisions'), chalk.red(String(result.collisions.length))]);
  }

  lines.push(summaryTable.toString());

  if (result.collisions.length > 0) {
    lines.push('');
    lines.push(chalk.bold(chalk.red('State Collisions')));
    lines.push(chalk.dim('\u2500'.repeat(60)));
    for (const collision of result.collisions) {
      lines.push(chalk.yellow(`  \u26A0 ${collision}`));
    }
  }

  lines.push('');
  lines.push(chalk.bold('Individual Results'));
  lines.push(chalk.dim('\u2500'.repeat(60)));

  for (const r of result.results) {
    lines.push(`  ${resultStatusIcon(r.status)} ${r.contractId}.${r.method} - ${r.status}`);
  }

  return lines.join('\n');
}

export function formatSuiteResult(result: SuiteResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(chalk.bold(`Suite: ${result.name}`));
  lines.push(chalk.dim('\u2500'.repeat(60)));

  const summaryTable = new Table({
    style: { head: [], border: [] },
    colWidths: [20, 40],
  });

  summaryTable.push(
    [chalk.bold('Status'), `${resultStatusIcon(result.status)} ${result.status}`],
    [chalk.bold('Network'), result.network],
    [chalk.bold('Duration'), `${result.duration}ms`],
    [chalk.bold('Steps'), String(result.results.length)],
  );

  lines.push(summaryTable.toString());

  lines.push('');
  lines.push(chalk.bold('Steps'));
  lines.push(chalk.dim('\u2500'.repeat(60)));

  for (const step of result.results) {
    const icon = resultStatusIcon(step.status);
    lines.push(`  ${icon} ${step.name} [${step.type}] - ${step.status}`);
    if (step.error) {
      lines.push(chalk.red(`      Error: ${step.error}`));
    }
  }

  return lines.join('\n');
}

function formatFeeEstimate(fee: FeeEstimate): string {
  const table = new Table({
    style: { head: [], border: [] },
    colWidths: [25, 35],
  });

  table.push(
    [chalk.bold('Min Fee'), `${fee.minFee} stroops`],
    [chalk.bold('Max Fee'), `${fee.maxFee} stroops`],
    [chalk.bold('Recommended Fee'), `${fee.recommendedFee} stroops`],
    [chalk.bold('Fee Surplus'), `${fee.feeSurplusPercent.toFixed(1)}%`],
    [chalk.bold('Instructions'), `${fee.instructions.toLocaleString()} / ${fee.maxInstructions.toLocaleString()}`],
    [chalk.bold('Read Bytes'), fee.readBytes.toLocaleString()],
    [chalk.bold('Write Bytes'), fee.writeBytes.toLocaleString()],
  );

  return table.toString();
}

function formatAuthResults(auth: AuthResult[]): string {
  const table = new Table({
    style: { head: ['cyan'], border: [] },
    head: ['Signer', 'Authorized', 'Weight', 'Threshold'],
    colWidths: [30, 12, 10, 12],
  });

  for (const entry of auth) {
    table.push([
      entry.signer,
      entry.authorized ? chalk.green('Yes') : chalk.red('No'),
      entry.weight?.toString() || '-',
      entry.threshold?.toString() || '-',
    ]);
  }

  return table.toString();
}

function formatCheckResults(checks: CheckResult[]): string {
  const table = new Table({
    style: { head: ['cyan'], border: [] },
    head: ['Check', 'Status', 'Message'],
    colWidths: [22, 10, 50],
  });

  for (const check of checks) {
    const color = check.severity === 'error' ? chalk.red :
                  check.severity === 'warn' ? chalk.yellow : chalk.green;
    table.push([
      color(check.check),
      `${statusIcon(check.status)} ${check.status}`,
      color(check.message),
    ]);
  }

  return table.toString();
}

function formatAIResponse(ai: AIResponse): string {
  const lines: string[] = [];

  lines.push(chalk.cyan(`Level: ${ai.level}`));
  lines.push('');
  lines.push(ai.summary);

  if (ai.suggestions && ai.suggestions.length > 0) {
    lines.push('');
    lines.push(chalk.bold('Suggestions:'));
    for (const s of ai.suggestions) {
      lines.push(chalk.cyan(`  \u2022 ${s}`));
    }
  }

  if (ai.errorExplanation) {
    lines.push('');
    lines.push(chalk.bold('Error Explanation:'));
    lines.push(ai.errorExplanation.explanation);
    if (ai.errorExplanation.relevantAccounts.length > 0) {
      lines.push(chalk.dim(`Accounts: ${ai.errorExplanation.relevantAccounts.join(', ')}`));
    }
    if (ai.errorExplanation.remediation.length > 0) {
      lines.push(chalk.bold('Remediation:'));
      for (const r of ai.errorExplanation.remediation) {
        lines.push(chalk.cyan(`  \u2022 ${r}`));
      }
    }
  }

  if (ai.optimization) {
    const opt = ai.optimization;
    lines.push('');
    lines.push(chalk.bold('Optimization Advice:'));
    if (opt.redundantReads.length > 0) {
      lines.push(chalk.yellow('  Redundant Reads:'));
      for (const r of opt.redundantReads) lines.push(`    \u2022 ${r}`);
    }
    if (opt.hotPaths.length > 0) {
      lines.push(chalk.yellow('  Hot Paths:'));
      for (const h of opt.hotPaths) lines.push(`    \u2022 ${h}`);
    }
    if (opt.storageInefficiencies.length > 0) {
      lines.push(chalk.yellow('  Storage Inefficiencies:'));
      for (const s of opt.storageInefficiencies) lines.push(`    \u2022 ${s}`);
    }
    if (opt.batchingOpportunities.length > 0) {
      lines.push(chalk.yellow('  Batching Opportunities:'));
      for (const b of opt.batchingOpportunities) lines.push(`    \u2022 ${b}`);
    }
  }

  if (ai.fix) {
    lines.push('');
    lines.push(chalk.bold('Suggested Fix:'));
    lines.push(chalk.green(ai.fix));
  }

  return lines.join('\n');
}

export function buildSimulationReport(result: SimulationResult): object {
  return {
    id: result.id,
    status: result.status,
    network: result.network,
    ledger: result.ledger,
    contractId: result.contractId,
    method: result.method,
    fee: result.fee,
    auth: result.auth,
    checks: result.checks,
    checkResults: result.checkResults,
    ai: result.ai ? {
      level: result.ai.level,
      summary: result.ai.summary,
      suggestions: result.ai.suggestions,
    } : undefined,
    error: result.error,
    timestamp: result.timestamp,
  };
}
