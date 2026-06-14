import { Command } from 'commander';
import { SoroPreFlight } from '@soropreflight/sdk';
import { formatDeployResult } from '../output/reporter';
import { writeJsonReport } from '../output/json-report';
import { writeHtmlReport } from '../output/html-report';

export function registerDeployCommand(program: Command): void {
  program
    .command('deploy')
    .description('Simulate a Soroban contract deployment')
    .requiredOption('-w, --wasm <path>', 'Path to WASM binary')
    .option('-s, --source <account>', 'Source account public key or secret')
    .option('-n, --network <network>', 'Network (mainnet, testnet, futurenet, local)', 'testnet')
    .option('-r, --rpc-url <url>', 'Soroban RPC URL')
    .option('--analyze <level>', 'AI analysis level (basic, deep, audit)')
    .option('--wasm-hash <hash>', 'Expected WASM hash')
    .option('--output-dir <path>', 'Output directory for reports', './preflight-reports')
    .option('--json', 'Output as JSON')
    .option('--html', 'Generate HTML report')
    .action(async (options) => {
      try {
        const { readFileSync } = await import('fs');

        let wasmContent: string;
        try {
          wasmContent = readFileSync(options.wasm, { encoding: 'base64' });
        } catch {
          console.error(`Error: Cannot read WASM file at ${options.wasm}`);
          process.exit(1);
        }

        const sdk = new SoroPreFlight({
          network: options.network,
          rpcUrl: options.rpcUrl,
        });

        const startTime = Date.now();
        const result = await sdk.deploy({
          wasm: wasmContent,
          sourceAccount: options.source || 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
          network: options.network,
          rpcUrl: options.rpcUrl,
          analyze: !!options.analyze,
          analysisLevel: options.analyze as any || undefined,
          expectedWasmHash: options.wasmHash,
        });
        const duration = Date.now() - startTime;

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(formatDeployResult(result));
          try {
            const chalk = require('chalk');
            console.log(chalk.dim(`Completed in ${duration}ms`));
          } catch {
            console.log(`Completed in ${duration}ms`);
          }
        }

        if (options.html) {
          const outputDir = options.outputDir as string;
          const htmlPath = writeHtmlReport(result, outputDir);
          try {
            const chalk = require('chalk');
            console.log(chalk.dim(`HTML report: ${htmlPath}`));
          } catch {
            console.log(`HTML report: ${htmlPath}`);
          }
        }

        const jsonPath = writeJsonReport(result, options.outputDir);
        try {
          const chalk = require('chalk');
          console.log(chalk.dim(`JSON report: ${jsonPath}`));
        } catch {
          console.log(`JSON report: ${jsonPath}`);
        }
      } catch (err) {
        console.error('Deploy simulation failed:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
