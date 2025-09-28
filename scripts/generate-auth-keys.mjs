#!/usr/bin/env node

// Generates a matching RS256 key pair (PKCS#8 private key + JWKS public key)
// and sets them in your Convex deployment env as JWT_PRIVATE_KEY and JWKS.

import { spawn } from 'node:child_process';
import { exportJWK, exportPKCS8, generateKeyPair } from 'jose';

function run(command, args, input) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: ['pipe', 'inherit', 'inherit'],
		});
		if (input) {
			child.stdin.write(input);
			child.stdin.end();
		}
		child.on('error', reject);
		child.on('exit', code => {
			if (code === 0) resolve();
			else
				reject(
					new Error(`${command} ${args.join(' ')} exited with code ${code}`)
				);
		});
	});
}

async function main() {
	console.log('Generating RS256 key pair...');
	const { privateKey, publicKey } = await generateKeyPair('RS256');
	const pkcs8 = await exportPKCS8(privateKey);
	const jwk = await exportJWK(publicKey);
	const jwks = JSON.stringify({ keys: [{ use: 'sig', ...jwk }] });

	console.log('Setting Convex env: JWT_PRIVATE_KEY (PKCS#8)...');
	// Use "--" to stop option parsing so PEM header lines aren't treated as flags
	await run('pnpm', [
		'-w',
		'exec',
		'convex',
		'env',
		'set',
		'JWT_PRIVATE_KEY',
		'--',
		pkcs8,
	]);

	console.log('Setting Convex env: JWKS (public key set)...');
	await run('pnpm', ['-w', 'exec', 'convex', 'env', 'set', 'JWKS', '--', jwks]);

	console.log(
		'Done. Restart your Convex dev server if running: pnpm dev:backend'
	);
}

main().catch(err => {
	console.error(err?.stack || String(err));
	process.exit(1);
});
