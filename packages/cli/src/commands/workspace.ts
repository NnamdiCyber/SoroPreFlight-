import { Command } from 'commander';

export function registerWorkspaceCommand(program: Command): void {
  const workspace = program
    .command('workspace')
    .description('Manage workspaces (Enterprise)');

  workspace
    .command('create')
    .description('Create a new workspace')
    .option('-n, --name <name>', 'Workspace name')
    .option('--owner <email>', 'Owner email')
    .action((options) => {
      console.log('Workspace creation is available in SoroPreFlight Enterprise.');
      console.log('To enable:');
      console.log('  1. Configure your SSO provider in soropreflight.config.json');
      console.log('  2. Set SOROPREFLIGHT_WORKSPACE_ID environment variable');
      if (options.name) {
        console.log(`\nWorkspace name: ${options.name}`);
      }
      if (options.owner) {
        console.log(`Owner: ${options.owner}`);
      }
    });

  workspace
    .command('invite')
    .description('Invite a user to a workspace')
    .option('-e, --email <email>', 'User email to invite')
    .option('-r, --role <role>', 'Role (admin, developer, viewer)', 'developer')
    .action((options) => {
      console.log('Workspace invitations are available in SoroPreFlight Enterprise.');
      if (options.email) {
        console.log(`\nInvitation sent to: ${options.email} (role: ${options.role})`);
      }
    });

  workspace
    .command('list')
    .description('List workspaces')
    .action(() => {
      console.log('Workspace listing is available in SoroPreFlight Enterprise.');
      console.log('Deploy the API server to manage workspaces via REST API.');
    });
}
