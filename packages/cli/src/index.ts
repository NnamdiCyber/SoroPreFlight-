#!/usr/bin/env node
import { Command } from 'commander';
import { registerSimulateCommand } from './commands/simulate';
import { registerDeployCommand } from './commands/deploy';
import { registerRunCommand } from './commands/run';
import { registerWorkspaceCommand } from './commands/workspace';
import { registerLogsCommand } from './commands/logs';

const program = new Command();

program
  .name('soropreflight')
  .description('SoroPreFlight — Pre-flight checks & AI-powered analysis for Soroban smart contracts')
  .version('0.1.0');

registerSimulateCommand(program);
registerDeployCommand(program);
registerRunCommand(program);
registerWorkspaceCommand(program);
registerLogsCommand(program);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
