#!/usr/bin/env node
const userAgent = process.env.npm_config_user_agent || '';
const execPath = process.env.npm_execpath || '';

const isPnpm = userAgent.includes('pnpm/') || /pnpm/.test(execPath);

if (!isPnpm) {
	console.error('\u274c This repository enforces pnpm.');
	console.error('Please use:');
	console.error('  pnpm install');
	console.error('  pnpm run <script>');
	process.exit(1);
}
