import { Command } from 'commander';
import { SoroPreFlight } from '@soropreflight/sdk';
import { formatSuiteResult } from '../output/reporter';
import { writeJsonReport } from '../output/json-report';
import { writeHtmlReport } from '../output/html-report';

export function registerRunCommand(program: Command): void {
  program
    .command('run')
    .description('Run a simulation suite from a YAML file')
    .requiredOption('-s, --suite <path>', 'Path to suite YAML file')
    .option('-n, --network <network>', 'Network override (mainnet, testnet, futurenet, local)')
    .option('-r, --rpc-url <url>', 'Soroban RPC URL override')
    .option('--output-dir <path>', 'Output directory for reports', './preflight-reports')
    .option('--json', 'Output as JSON')
    .option('--html', 'Generate HTML report')
    .action(async (options) => {
      try {
        const sdk = new SoroPreFlight({
          network: options.network,
          rpcUrl: options.rpcUrl,
        });

        const startTime = Date.now();
        const result = await sdk.runSuite(options.suite);
        const duration = Date.now() - startTime;

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(formatSuiteResult(result));
          try {
            const chalk = require('chalk');
            console.log(chalk.dim(`Suite completed in ${duration}ms`));
          } catch {
            console.log(`Suite completed in ${duration}ms`);
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

        if (result.status === 'ALL_FAIL' || result.status === 'PARTIAL_FAIL') {
          process.exit(1);
        }
      } catch (err) {
        console.error('Suite execution failed:', err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
