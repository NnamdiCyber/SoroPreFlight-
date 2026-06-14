import { Command } from 'commander';

export function registerLogsCommand(program: Command): void {
  const logs = program
    .command('logs')
    .description('Manage audit logs (Enterprise)');

  logs
    .command('export')
    .description('Export audit logs')
    .option('-f, --format <format>', 'Export format (json, csv)', 'json')
    .option('--since <date>', 'Start date (ISO 8601)')
    .option('--until <date>', 'End date (ISO 8601)')
    .option('--workspace <id>', 'Workspace ID')
    .option('--output <path>', 'Output file path', './audit-logs.json')
    .action((options) => {
      console.log('Audit log export is available in SoroPreFlight Enterprise.');
      console.log('To use this feature:');
      console.log('  1. Deploy the API server with database backend');
      console.log('  2. Configure audit logging in soropreflight.config.json');
      console.log('  3. Ensure SOROPREFLIGHT_AUDIT_LOG=true');
      if (options.format) console.log(`\nFormat: ${options.format}`);
      if (options.since) console.log(`Since: ${options.since}`);
      if (options.until) console.log(`Until: ${options.until}`);
      if (options.workspace) console.log(`Workspace: ${options.workspace}`);
      console.log(`Output: ${options.output}`);
    });

  logs
    .command('list')
    .description('List recent audit log entries')
    .option('-l, --limit <number>', 'Number of entries', '50')
    .option('--workspace <id>', 'Workspace ID')
    .action((options) => {
      console.log('Audit log listing is available in SoroPreFlight Enterprise.');
      console.log('Deploy the API server and configure the database to view logs.');
    });
}
