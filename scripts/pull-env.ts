import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import chalk from 'chalk';

// Default Infisical project ID (can be overridden via INFISICAL_PROJECT_ID env var)
const DEFAULT_INFISICAL_PROJECT_ID = '8357f813-7b71-4d47-a6a1-534ad8a49fe2';

type Stage = 'dev' | 'production';
type ChalkColor =
	| 'cyan'
	| 'blue'
	| 'green'
	| 'magenta'
	| 'yellow'
	| 'red'
	| 'gray';

type StringMap = Record<string, string>;

const DEBUG =
	!!process.env.PULL_ENV_DEBUG && process.env.PULL_ENV_DEBUG !== '0';

function log(scope: string, message: string, color: ChalkColor = 'cyan'): void {
	const tag = (chalk as any)[color](`[${scope}]`);
	console.log(`${tag} ${message}`);
}

function fail(scope: string, message: string): never {
	console.error(`${chalk.red(`[${scope}]`)} ${message}`);
	process.exit(1);
}

function ensureDir(path: string): void {
	try {
		mkdirSync(path, { recursive: true });
	} catch {}
}

function readEnv(name: string): string | null {
	const v = process.env[name];
	return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
}

function detectConvexDeployment(stage: Stage): string | null {
	// Only respect explicit env to avoid CLI compatibility issues
	const explicit = readEnv('CONVEX_DEPLOYMENT');
	if (explicit) return explicit;
	return null;
}

function getInfisicalToken(stage: Stage): string | null {
	// Allow per-stage tokens, falling back to a generic token
	const perStage = readEnv(
		stage === 'production' ? 'INFISICAL_TOKEN_PROD' : 'INFISICAL_TOKEN_DEV'
	);
	return perStage || readEnv('INFISICAL_TOKEN');
}

function exportSecretsMap(
	stage: Stage,
	tag?: 'next' | 'vite' | 'expo'
): StringMap {
	const projectId =
		readEnv('INFISICAL_PROJECT_ID') || DEFAULT_INFISICAL_PROJECT_ID;
	const token = getInfisicalToken(stage);
	// Build args; prefer explicit project and token to avoid cross-account confusion
	const args = [
		'export',
		'--projectId',
		projectId,
		'--env',
		stage,
		'--format',
		'json',
	];
	if (tag) {
		args.push('--tags', tag);
	}
	if (token) {
		args.push('--token', token);
		log(
			'infisical',
			chalk.gray(
				`using service token from ${
					stage === 'production'
						? 'INFISICAL_TOKEN_PROD'
						: 'INFISICAL_TOKEN_DEV'
				} / INFISICAL_TOKEN`
			)
		);
	} else {
		log(
			'infisical',
			chalk.gray('using logged-in Infisical session (no --token)')
		);
	}
	// Mask token in displayed command
	const displayArgs = [...args];
	const tokenIdx = displayArgs.findIndex(a => a === '--token');
	if (tokenIdx !== -1 && tokenIdx + 1 < displayArgs.length)
		displayArgs[tokenIdx + 1] = '***';
	log('infisical', chalk.gray(`infisical ${displayArgs.join(' ')}`));
	const res = spawnSync('infisical', args, {
		stdio: ['ignore', 'pipe', 'pipe'],
		encoding: 'utf8',
	});
	if (res.status !== 0) {
		const stderr = (res.stderr || '').trim();
		if (!token) {
			fail(
				'infisical',
				`Failed to export secrets from project ${projectId} (${stage}) using your logged-in session. This usually means your current Infisical login doesn't have access to this project or you're logged into the wrong account. Run 'infisical login' with the correct account, or set INFISICAL_TOKEN_${stage === 'production' ? 'PROD' : 'DEV'} / INFISICAL_TOKEN.\n\n${stderr ? `CLI output: ${stderr}` : ''}`
			);
		} else {
			fail(
				'infisical',
				`Failed to export secrets from project ${projectId} (${stage}) using the provided service token. Verify the token is valid and has access to this project and environment.\n\n${stderr ? `CLI output: ${stderr}` : ''}`
			);
		}
	}
	try {
		const parsed = JSON.parse(String(res.stdout || '').trim());
		// Expected format is an object mapping key -> value
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			const map: StringMap = {};
			for (const [k, v] of Object.entries(parsed as Record<string, any>)) {
				map[String(k)] = String(v ?? '');
			}
			return map;
		}
		// Fallback: array of { key, value }
		if (Array.isArray(parsed)) {
			const map: StringMap = {};
			for (const item of parsed as Array<any>) {
				const k = String(item?.key ?? item?.secretKey ?? '');
				if (!k) continue;
				map[k] = String(item?.value ?? item?.secretValue ?? '');
			}
			return map;
		}
		return {};
	} catch {
		fail('infisical', 'Failed to parse JSON output from Infisical CLI.');
	}
}

function exportSecretsMapByPath(stage: Stage, pathValue: string): StringMap {
	const projectId =
		readEnv('INFISICAL_PROJECT_ID') || DEFAULT_INFISICAL_PROJECT_ID;
	const token = getInfisicalToken(stage);
	const args = [
		'export',
		'--projectId',
		projectId,
		'--env',
		stage,
		'--format',
		'json',
		'--path',
		pathValue,
	];
	if (token) args.push('--token', token);
	const displayArgs = [...args];
	const tokenIdx = displayArgs.findIndex(a => a === '--token');
	if (tokenIdx !== -1 && tokenIdx + 1 < displayArgs.length)
		displayArgs[tokenIdx + 1] = '***';
	log('infisical', chalk.gray(`infisical ${displayArgs.join(' ')}`));
	const res = spawnSync('infisical', args, {
		stdio: ['ignore', 'pipe', 'pipe'],
		encoding: 'utf8',
	});
	if (res.status !== 0) return {};
	try {
		const parsed = JSON.parse(String(res.stdout || '').trim());
		if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
			const map: StringMap = {};
			for (const [k, v] of Object.entries(parsed as Record<string, any>))
				map[String(k)] = String(v ?? '');
			return map;
		}
		if (Array.isArray(parsed)) {
			const map: StringMap = {};
			for (const item of parsed as Array<any>) {
				const k = String(item?.key ?? item?.secretKey ?? '');
				if (!k) continue;
				map[k] = String(item?.value ?? item?.secretValue ?? '');
			}
			return map;
		}
		return {};
	} catch {
		return {};
	}
}

function parseSlugList(value: string | null, defaults: string[]): string[] {
	const list = (value || '')
		.split(',')
		.map(s => s.trim())
		.filter(Boolean);
	return list.length > 0 ? list : defaults;
}

function exportSecretsMapTryTags(
	stage: Stage,
	slugs: string[],
	label: string
): { map: StringMap; matched: Array<{ slug: string; count: number }> } {
	const matched: Array<{ slug: string; count: number }> = [];
	const aggregate: StringMap = {};
	for (const slug of slugs) {
		const map = exportSecretsMap(stage, slug as any);
		const count = Object.keys(map).length;
		matched.push({ slug, count });
		if (count > 0) {
			for (const [k, v] of Object.entries(map)) aggregate[k] = v;
		}
		if (DEBUG) {
			const keys = Object.keys(map).slice(0, 10);
			log(
				`tags:${label}`,
				`slug '${slug}' → ${chalk.bold(String(count))}${keys.length ? ` e.g. ${keys.join(', ')}` : ''}`,
				'yellow'
			);
		}
	}
	return { map: aggregate, matched };
}

function exportSecretsMapTryPaths(
	stage: Stage,
	paths: string[],
	label: string
): { map: StringMap; matched: Array<{ path: string; count: number }> } {
	const matched: Array<{ path: string; count: number }> = [];
	const aggregate: StringMap = {};
	for (const p of paths) {
		const normalized = p.startsWith('/') ? p : `/${p}`;
		const map = exportSecretsMapByPath(stage, normalized);
		const count = Object.keys(map).length;
		matched.push({ path: normalized, count });
		if (count > 0) {
			for (const [k, v] of Object.entries(map)) aggregate[k] = v;
		}
		if (DEBUG) {
			const keys = Object.keys(map).slice(0, 10);
			log(
				`paths:${label}`,
				`path '${normalized}' → ${chalk.bold(String(count))}${keys.length ? ` e.g. ${keys.join(', ')}` : ''}`,
				'yellow'
			);
		}
	}
	return { map: aggregate, matched };
}

function buildEnvMap(stage: Stage): StringMap {
	// Base secrets: all
	const base = exportSecretsMap(stage);
	// Tag-specific subsets (hard-coded slugs for speed)
	const nextRes = exportSecretsMapTryTags(stage, ['next'], 'next');
	const viteRes = exportSecretsMapTryTags(stage, ['vite'], 'vite');
	const expoRes = exportSecretsMapTryTags(stage, ['expo'], 'expo');
	const nextOnly = nextRes.map;
	const viteOnly = viteRes.map;
	const expoOnly = expoRes.map;

	const map: StringMap = { ...base };
	for (const [k, v] of Object.entries(nextOnly)) map[`NEXT_PUBLIC_${k}`] = v;
	for (const [k, v] of Object.entries(viteOnly)) map[`VITE_${k}`] = v;
	for (const [k, v] of Object.entries(expoOnly)) map[`EXPO_PUBLIC_${k}`] = v;

	log(
		'tags',
		`Tagged counts → next: ${chalk.bold(String(Object.keys(nextOnly).length))}, vite: ${chalk.bold(String(Object.keys(viteOnly).length))}, expo: ${chalk.bold(String(Object.keys(expoOnly).length))}`,
		'magenta'
	);
	if (DEBUG) {
		const show = (label: string, m: StringMap) => {
			const keys = Object.keys(m).sort();
			log(`tags:${label}`, `keys (${keys.length}): ${keys.join(', ')}`, 'gray');
		};
		show('next', nextOnly);
		show('vite', viteOnly);
		show('expo', expoOnly);
	}
	return map;
}

function writeDotenvFiles(envVars: StringMap): void {
	const lines = Object.keys(envVars)
		.sort((a, b) => a.localeCompare(b))
		.map(k => `${k}=${envVars[k] ?? ''}`);
	const contents = lines.join('\n') + '\n';

	const targets = [
		'.env',
		'apps/web/.env',
		'apps/mobile/.env',
		'apps/browser-extension/.env',
	];

	for (const rel of targets) {
		const file = resolve(process.cwd(), rel);
		ensureDir(dirname(file));
		writeFileSync(file, contents, 'utf8');
		log('write', `${chalk.bold(rel)} updated`, 'green');
	}
}

function setEnvInConvex(envVars: StringMap, stage: Stage): void {
	const fromMap = (envVars['CONVEX_DEPLOYMENT'] || '').trim();
	const deployment = fromMap || detectConvexDeployment(stage);
	if (!deployment) {
		log(
			'convex',
			chalk.yellow(
				`Could not determine deployment for ${stage}. Set CONVEX_DEPLOYMENT or run 'npx convex deployments list' to find it. Skipping Convex env sync.`
			)
		);
		return;
	}
	log(
		'convex',
		`Target deployment: ${chalk.bold(deployment)}${fromMap ? chalk.gray(' (from Infisical)') : ''}`,
		'magenta'
	);

	const env = { ...process.env, CONVEX_DEPLOYMENT: deployment };

	// Do not sync framework public envs or Convex built-ins
	const isPublicPrefixed = (name: string): boolean =>
		name.startsWith('NEXT_PUBLIC_') ||
		name.startsWith('VITE_') ||
		name.startsWith('EXPO_PUBLIC_');
	const convexBuiltin = new Set<string>([
		'CONVEX_SITE_URL',
		'CONVEX_DEPLOYMENT',
		'CONVEX_URL',
	]);
	const entries = Object.entries(envVars).filter(
		([name]) => !isPublicPrefixed(name) && !convexBuiltin.has(name)
	);
	let ok = 0;
	let failCount = 0;
	for (const [name, value] of entries) {
		// Use spawn to avoid shell-escaping issues
		// Insert "--" before the value so hyphens in values (e.g., PEM keys) are not parsed as options
		const res = spawnSync(
			'npx',
			['-y', 'convex', 'env', 'set', name, '--', value],
			{
				stdio: ['ignore', 'pipe', 'pipe'],
				encoding: 'utf8',
				env,
			}
		);
		if (res.status === 0) {
			ok++;
		} else {
			failCount++;
			console.error(chalk.red(`[convex] failed to set ${name}`));
			if (res.stderr) console.error(chalk.gray(res.stderr.trim()));
		}
	}
	log(
		'convex',
		`${chalk.green(`${ok} set`)}${failCount ? `, ${chalk.red(`${failCount} failed`)}` : ''}`
	);
}

async function main(): Promise<void> {
	const argv = process.argv
		.slice(2)
		.map(s => String(s).trim())
		.filter(Boolean);
	let stage: Stage | null = null;
	let debugFlag = false;
	for (const arg of argv) {
		if (arg === 'dev' || arg === 'production') stage = arg as Stage;
		if (arg === '--debug') debugFlag = true;
	}
	if (!stage) {
		fail(
			'pull-env',
			`Usage: tsx scripts/pull-env.ts <dev|production> [--debug]`
		);
	}
	if (debugFlag) (globalThis as any).PULL_ENV_DEBUG = '1';
	if (!!process.env.PULL_ENV_DEBUG && process.env.PULL_ENV_DEBUG !== '0') {
		log('pull-env', 'Debug mode enabled', 'yellow');
	}

	log(
		'pull-env',
		`Fetching secrets for ${chalk.bold(stage!)} from Infisical...`,
		'blue'
	);
	const envVars = buildEnvMap(stage!);
	log(
		'pull-env',
		`Collected ${chalk.bold(String(Object.keys(envVars).length))} .env entries`
	);

	writeDotenvFiles(envVars);

	log('pull-env', `Syncing variables to Convex (${stage!})...`, 'blue');
	setEnvInConvex(envVars, stage!);

	log('pull-env', chalk.green('Done.'));
}

main().catch(err => {
	console.error(chalk.red('[pull-env] Uncaught error'), err);
	process.exit(1);
});
