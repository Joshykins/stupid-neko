#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isWsl() {
	try {
		if (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP) return true;
		const release = os.release().toLowerCase();
		if (release.includes('microsoft')) return true;
	} catch {}
	return false;
}

const expoCli = path.resolve(__dirname, '../node_modules/expo/bin/cli');

const userArgs = process.argv.slice(2);
const args = ['start']; // default command

// Ensure cache clear once by default
if (!userArgs.includes('--clear')) userArgs.push('--clear');

// If on WSL, force tunnel so devices can connect
if (isWsl() && !userArgs.includes('--tunnel')) userArgs.push('--tunnel');

args.push(...userArgs);

const child = spawn(process.execPath, [expoCli, ...args], {
	stdio: 'inherit',
	cwd: process.cwd(),
	env: process.env,
});

child.on('exit', code => process.exit(code ?? 0));
