/* eslint-disable no-console */
/*
 Simple prefixed logger for the browser extension.

 Requirements implemented per request:
 - All logs are prefixed with [snbex]
 - Each logger instance prints: [snbex] [area] [scope] [LEVEL] message
   where `area` is the runtime (e.g. service-worker | content | popup)
   and `scope` is a known feature/domain area (e.g. auth | tabs | providers | widget ...)
 - A central type of all known scope prefixes is defined here for consistency.
 - No dynamic enable/disable or storage persistence (search by prefixes in DevTools).
*/

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

// High-level runtime areas where logs come from
export type LogArea =
	| 'service-worker'
	| 'content'
	| 'popup'
	| 'side-panel'
	| 'options';

// Known scopes within the extension codebase. Keep this list current as you add features.
export const KNOWN_SCOPES = [
	'auth:get-me',
	'settings:integration-key',
	'providers:no-provider-yet',
	'providers:website-provider',
	'providers:youtube',
	'providers:activation',
	'providers:determine',
	'messaging:bg',
	'messaging:content',
	'handlers:bg',
	'content-activity:router',
	'widget:state-updates',
	'widget:ui',
	'popup:main-view',
	'popup:widget-settings',
	'popup:content-label',
	'popup:hooks',
] as const;
export type LogScope = (typeof KNOWN_SCOPES)[number];

export interface Logger {
	area: LogArea;
	scope: LogScope;
	error: (...args: unknown[]) => void;
	warn: (...args: unknown[]) => void;
	info: (...args: unknown[]) => void;
	debug: (...args: unknown[]) => void;
}

function format(area: LogArea, scope: LogScope, level: LogLevel): string {
	return `[snbex] [${area}] [${scope}] [${level.toUpperCase()}]`;
}

const ENV: 'DEVELOPMENT' | 'PRODUCTION' | undefined =
	(process.env.VITE_ENV as 'DEVELOPMENT' | 'PRODUCTION' | undefined) ||
	undefined;

function emit(
	level: LogLevel,
	area: LogArea,
	scope: LogScope,
	args: unknown[]
) {
	// In PRODUCTION, suppress all logs from the platform logger
	if (ENV === 'PRODUCTION') return;

	const line = format(area, scope, level);
	let method: (...args: unknown[]) => void;
	switch (level) {
		case 'error':
			method = console.error;
			break;
		case 'warn':
			method = console.warn;
			break;
		case 'info':
			method = console.info;
			break;
		case 'debug':
			method = console.debug;
			break;
		default:
			method = console.log;
	}
	try {
		method(line, ...args);
	} catch {
		try {
			console.log(line, ...args);
		} catch {
			/* ignore */
		}
	}
}

export function createLogger(area: LogArea, scope: LogScope): Logger {
	return {
		area,
		scope,
		error: (...args: unknown[]) => emit('error', area, scope, args),
		warn: (...args: unknown[]) => emit('warn', area, scope, args),
		info: (...args: unknown[]) => emit('info', area, scope, args),
		debug: (...args: unknown[]) => emit('debug', area, scope, args),
	};
}

// Convenience: quick factory if you want to pre-bind only the area
export function createAreaLogger(area: LogArea) {
	return (scope: LogScope) => createLogger(area, scope);
}

// Example (keep short for reference):
// const logBgAuth = createLogger('service-worker', 'auth');
// logBgAuth.info('Starting auth flow');
