#!/usr/bin/env node

import { Command } from 'commander';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { startServer } from './server/server.js';

const program = new Command();

program
  .name('agent-scope')
  .description('Deterministic, local, passive execution observer for AI agent workflows')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize agent-scope in current directory')
  .action(() => {
    const agentScopeDir = join(process.cwd(), '.agent-scope');

    // Create .agent-scope/ directory
    if (existsSync(agentScopeDir)) {
      console.log('⚠️  .agent-scope/ already exists');
      process.exit(1);
    }

    try {
      mkdirSync(agentScopeDir);
      console.log('✓ Created .agent-scope/ folder');

      // Create queue.md template
      const queueTemplate = `# Slice S1

## S1-T1
Area: Core
Depends: -
Description: First task
AC: Task completed successfully
`;
      writeFileSync(join(agentScopeDir, 'queue.md'), queueTemplate);
      console.log('✓ Created queue.md template');

      // Create empty execution.log
      writeFileSync(join(agentScopeDir, 'execution.log'), '');
      console.log('✓ Created execution.log');

      // Create config.json
      const config = {
        queueFile: 'queue.md',
        logFile: 'execution.log',
        port: 4317
      };
      writeFileSync(join(agentScopeDir, 'config.json'), JSON.stringify(config, null, 2));
      console.log('✓ Created config.json');

      // Generate Claude.md snippet
      const claudeMdSnippet = `
# Agent Scope Integration

When working on tasks, log your progress to \`.agent-scope/execution.log\`:

## Log Format (JSONL)

Each completed task should be logged as a single line:

\`\`\`json
{"task_id":"S1-T1","status":"DONE","timestamp":"2026-02-16T14:31:22Z","agent":"claude"}
\`\`\`

Or for failures:

\`\`\`json
{"task_id":"S1-T2","status":"FAILED","timestamp":"2026-02-16T14:33:10Z","agent":"claude","meta":{"reason":"timeout"}}
\`\`\`

## Required Fields

- \`task_id\`: Task identifier from queue.md (e.g., "S1-T1")
- \`status\`: Either "DONE" or "FAILED"
- \`timestamp\`: ISO-8601 timestamp (use \`new Date().toISOString()\`)
- \`agent\`: Your agent name (e.g., "claude")
- \`meta\`: (Optional) Additional context

Run \`npx agent-scope start\` to view the dashboard.
`;

      console.log('✓ Ready to use! Add this to your Claude.md:\n');
      console.log(claudeMdSnippet);
    } catch (error) {
      console.error('❌ Failed to initialize:', error);
      process.exit(1);
    }
  });

program
  .command('start')
  .description('Start the agent-scope server and dashboard')
  .action(async () => {
    const agentScopeDir = join(process.cwd(), '.agent-scope');

    // Verify .agent-scope/ exists
    if (!existsSync(agentScopeDir)) {
      console.error('❌ .agent-scope/ not found. Run "agent-scope init" first.');
      process.exit(1);
    }

    // Read config
    const configPath = join(agentScopeDir, 'config.json');
    if (!existsSync(configPath)) {
      console.error('❌ config.json not found in .agent-scope/');
      process.exit(1);
    }

    let config: { port: number };
    try {
      const configContent = await import('fs').then(fs =>
        fs.promises.readFile(configPath, 'utf-8')
      );
      config = JSON.parse(configContent);
    } catch (error) {
      console.error('❌ Failed to read config.json:', error);
      process.exit(1);
    }

    const port = config.port || 4317;
    const url = `http://localhost:${port}`;

    try {
      // Start server
      await startServer(agentScopeDir, port);
      console.log(`✓ Server running on ${url}`);
      console.log('✓ Opening browser...');

      // Auto-open browser
      const platform = process.platform;
      const openCommand = platform === 'darwin' ? 'open' :
                         platform === 'win32' ? 'start' :
                         'xdg-open';

      exec(`${openCommand} ${url}`, (error) => {
        if (error) {
          console.log('Could not auto-open browser. Please visit:', url);
        }
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  });

program.parse();
