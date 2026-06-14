import { Command } from 'commander';
import { SoroPreFlight, ScVal } from '@soropreflight/sdk';
import { formatSimulationResult, buildSimulationReport } from '../output/reporter';
import { writeJsonReport } from '../output/json-report';
import { writeHtmlReport } from '../output/html-report';
import * as fs from 'fs';

export function registerSimulateCommand(program: Command): void {
  program
    .command('simulate')
    .description('Simulate a Soroban contract function call')
    .requiredOption('-c, --contract <id>', 'Contract ID to simulate')
    .requiredOption('-f, --function <name>', 'Function name to call')
    .option('-a, --args <json>', 'Function arguments as JSON string')
    .option('-s, --source <account>', 'Source account public key or secret')
    .option('-n, --network <network>', 'Network (mainnet, testnet, futurenet, local)', 'testnet')
    .option('-r, --rpc-url <url>', 'Soroban RPC URL')
    .option('--analyze <level>', 'AI analysis level (basic, deep, audit)')
    .option('-w, --watch', 'Watch mode: re-run simulation periodically')
    .option('--fork-ledger <number>', 'Fork ledger for simulation', parseInt)
    .option('--output-dir <path>', 'Output directory for reports', './preflight-reports')
    .option('--json', 'Output as JSON')
    .option('--html', 'Generate HTML report')
    .action(async (options) => {
      try {
        let args: ScVal[] = [];
        if (options.args) {
          try {
            args = typeof options.args === 'string'
              ? JSON.parse(options.args)
              : options.args;
          } catch {
            console.error('Error: --args must be a valid JSON string');
            process.exit(1);
          }
        }

        const sdk = new SoroPreFlight({
          network: options.network,
          rpcUrl: options.rpcUrl,
        });

        const startTime = Date.now();
        const result = await sdk.simulate({
          contractId: options.contract,
          method: options.function,
          args,
          sourceAccount: options.source || 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
          network: options.network,
          rpcUrl: options.rpcUrl,
          forkLedger: options.forkLedger || null,
          analyze: !!options.analyze,
          analysisLevel: options.analyze as any || undefined,
        });
        const duration = Date.now() - startTime;

        if (options.json) {
          console.log(JSON.stringify(buildSimulationReport(result), null, 2));
        } else {
          console.log(formatSimulationResult(result));
          console.log(chalkDim(`Completed in ${duration}ms`));
        }

        if (options.html) {
          const outputDir = options.outputDir as string;
          const htmlPath = writeHtmlReport(result, outputDir);
          console.log(chalkDim(`HTML report: ${htmlPath}`));
        }

        const jsonPath = writeJsonReport(result, options.outputDir);
        console.log(chalkDim(`JSON report: ${jsonPath}`));

        if (options.watch) {
          console.log(chalkDim('\nWatch mode: re-running every 30s...'));
          setInterval(async () => {
            const newResult = await sdk.simulate({
              contractId: options.contract,
              method: options.function,
              args,
              sourceAccount: options.source || 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
              network: options.network,
              rpcUrl: options.rpcUrl,
              forkLedger: options.forkLedger || null,
              analyze: !!options.analyze,
              analysisLevel: options.analyze as any || undefined,
            });
            console.clear();
            console.log(formatSimulationResult(newResult));
          }, 30_000);
        }
      } catch (err) {
        console.error('Simulation failed:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}

function chalkDim(text: string): string {
  try {
    const chalk = require('chalk');
    return chalk.dim(text);
  } catch {
    return text;
  }
}
