// Authentication management for background script

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { tryCatch } from "../../../../../lib/tryCatch";
import type { AuthMe } from "../../messaging/messages";

// Constants
const AUTH_CACHE_DURATION_MS = 60_000;
const DEBUG_LOG_PREFIX = "[bg:auth]";

// Types
export type AuthState = {
	isAuthed: boolean;
	me: AuthMe | null;
};

export type AuthCache = {
	value: AuthState | null;
	fetchedAt: number | null;
};

// State
let lastAuthState: AuthCache = {
	value: null,
	fetchedAt: null,
};

// Environment helpers
function getEnv(
	name: "CONVEX_URL" | "CONVEX_SITE_URL" | "SITE_URL",
): string | undefined {
	const globalThisObj = globalThis as Record<string, unknown>;
	const importMeta = import.meta as unknown as Record<string, unknown>;

	// Prefer compile-time injected constants if available
	const buildTimeValue = (() => {
		switch (name) {
			case "CONVEX_URL":
				return import.meta.env.VITE_CONVEX_URL as string | undefined;
			case "CONVEX_SITE_URL":
				return import.meta.env.VITE_CONVEX_SITE_URL;
			case "SITE_URL":
				return import.meta.env.VITE_SITE_URL;
			default:
				return undefined;
		}
	})();

	if (buildTimeValue) {
		return buildTimeValue;
	}

	// Fallbacks: Vite env and global shims
	const envObj = importMeta.env as Record<string, unknown>;
	return (
		(globalThisObj[`VITE_${name}`] as string) ||
		(envObj[`VITE_${name}`] as string) ||
		(globalThisObj[name] as string) ||
		(envObj[name] as string)
	);
}

// Convex HTTP client initialization
const CONVEX_URL = getEnv("CONVEX_URL") || getEnv("CONVEX_SITE_URL");
export const convex = CONVEX_URL
	? new ConvexHttpClient(CONVEX_URL, {
			// Allow using .convex.site host during development if needed
			skipConvexDeploymentUrlCheck: /\.convex\.site$/i.test(CONVEX_URL),
		})
	: null;

// Integration ID storage helpers
export async function getIntegrationId(): Promise<string | null> {
	const { data: storageData, error: storageError } = await tryCatch(
		new Promise<Record<string, unknown>>((resolve) => {
			chrome.storage.sync.get(["integrationId"], (items) => {
				resolve(items || {});
			});
		}),
	);

	if (storageError || !storageData) {
		console.warn(
			`${DEBUG_LOG_PREFIX} failed to get integration ID:`,
			storageError,
		);
		return null;
	}

	const integrationId = storageData.integrationId;
	if (typeof integrationId === "string") {
		const trimmed = integrationId.trim();
		return trimmed || null;
	}

	return null;
}

export async function fetchMe(): Promise<AuthState> {
	const integrationId = await getIntegrationId();
	console.log(`${DEBUG_LOG_PREFIX} fetchMe - integrationId:`, integrationId);

	if (!integrationId || !convex) {
		console.log(`${DEBUG_LOG_PREFIX} fetchMe - no integrationId or convex`);
		return { isAuthed: false, me: null };
	}

	console.log(`${DEBUG_LOG_PREFIX} fetchMe - calling meFromIntegration`);
	const { data: me, error: meError } = await tryCatch(
		convex.query(api.browserExtensionFunctions.meFromIntegration, {
			integrationId,
		}),
	);

	console.log(`${DEBUG_LOG_PREFIX} fetchMe - meFromIntegration result:`, {
		me,
		meError,
	});

	if (meError || !me) {
		console.log(
			`${DEBUG_LOG_PREFIX} fetchMe - authentication failed:`,
			meError,
		);
		return { isAuthed: false, me: null };
	}

	// Mark the integration key as used when successfully authenticated
	console.log(`${DEBUG_LOG_PREFIX} fetchMe - marking integration key as used`);
	const { error: markError } = await tryCatch(
		convex.mutation(
			api.browserExtensionFunctions.markIntegrationKeyAsUsedFromExtension,
			{
				integrationId,
			},
		),
	);

	// Ignore markError - this is best effort
	if (markError) {
		console.warn(
			`${DEBUG_LOG_PREFIX} failed to mark integration key as used:`,
			markError,
		);
	}

	console.log(`${DEBUG_LOG_PREFIX} fetchMe - authentication successful`);
	return { isAuthed: true, me: me as AuthMe };
}

export async function getAuthState(): Promise<AuthState> {
	const now = Date.now();
	console.log(`${DEBUG_LOG_PREFIX} GET_AUTH_STATE`, lastAuthState);

	const isFresh =
		lastAuthState.value &&
		lastAuthState.fetchedAt &&
		now - lastAuthState.fetchedAt < AUTH_CACHE_DURATION_MS;

	if (isFresh) {
		return lastAuthState.value || { isAuthed: false, me: null };
	}

	const { data: auth, error } = await tryCatch(fetchMe());

	if (error) {
		console.error(`${DEBUG_LOG_PREFIX} fetchMe failed:`, error);
		return { isAuthed: false, me: null };
	}

	lastAuthState = { value: auth, fetchedAt: Date.now() };
	return auth;
}

export async function refreshAuth(): Promise<{
	ok: boolean;
	auth?: AuthState;
	error?: string;
}> {
	console.log(`${DEBUG_LOG_PREFIX} REFRESH_AUTH`);

	// Invalidate cache and refetch right away
	lastAuthState = { value: null, fetchedAt: null };

	const { data: auth, error } = await tryCatch(fetchMe());

	if (error) {
		console.error(`${DEBUG_LOG_PREFIX} fetchMe failed:`, error);
		return { ok: false, error: error.message };
	}

	console.log(`${DEBUG_LOG_PREFIX} fetchMe success:`, auth);
	lastAuthState = { value: auth, fetchedAt: Date.now() };
	return { ok: true, auth };
}

export function invalidateAuthCache(): void {
	console.log(
		`${DEBUG_LOG_PREFIX} integration ID changed, invalidating auth cache`,
	);
	lastAuthState = { value: null, fetchedAt: null };
}
