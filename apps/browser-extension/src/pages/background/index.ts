// Background scripts cannot render UI; send messages to content for toasts

console.log("background script loaded");

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { tryCatch } from "../../../../../lib/tryCatch";

// Constants
const AUTH_CACHE_DURATION_MS = 60_000;
const DEBUG_LOG_PREFIX = "[bg]";

// Environment variables with proper typing
const BUILD_CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL;
const BUILD_CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string | undefined;
const BUILD_SITE_URL = import.meta.env.VITE_SITE_URL;

// Environment validation
try {
	console.debug(`${DEBUG_LOG_PREFIX} env check`, {
		convexCloud: BUILD_CONVEX_URL || undefined,
		convexSite: BUILD_CONVEX_SITE_URL || undefined,
		web: BUILD_SITE_URL || undefined,
	});
} catch (error) {
	console.warn(`${DEBUG_LOG_PREFIX} env check failed:`, error);
}

// Types
type PlaybackEvent = {
	source: "youtube";
	event: "start" | "pause" | "end" | "progress";
	url: string;
	title?: string;
	videoId?: string;
	ts: number;
	position?: number;
	duration?: number;
	rate?: number;
	matchesTarget?: boolean;
};

type TabPlaybackState = {
	lastEvent: PlaybackEvent | null;
	isPlaying: boolean;
	allowPost?: boolean;
	lastContentKey?: string;
};

type AuthMe = {
	name?: string;
	email?: string;
	image?: string;
	username?: string;
	timezone?: string;
	languageCode?: string;
};

type AuthState = {
	isAuthed: boolean;
	me: AuthMe | null;
};

type AuthCache = {
	value: AuthState | null;
	fetchedAt: number | null;
};

type ContentActivityResult = {
	ok: boolean;
	saved: boolean;
	contentActivityId?: string;
	contentLabelId?: string;
	isWaitingOnLabeling?: boolean;
	reason?: string;
	contentKey?: string;
	contentLabel?: unknown;
	currentTargetLanguage?: { languageCode?: string } | null;
};

type ContentLabel = {
	[key: string]: unknown;
};

// State management
const tabStates: Record<number, TabPlaybackState> = {};
const contentLabelsByKey: Record<string, ContentLabel> = {};
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
				return BUILD_CONVEX_URL;
			case "CONVEX_SITE_URL":
				return BUILD_CONVEX_SITE_URL;
			case "SITE_URL":
				return BUILD_SITE_URL;
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
const convex = CONVEX_URL
	? new ConvexHttpClient(CONVEX_URL, {
			// Allow using .convex.site host during development if needed
			skipConvexDeploymentUrlCheck: /\.convex\.site$/i.test(CONVEX_URL),
		})
	: null;

// Integration ID storage helpers
async function getIntegrationId(): Promise<string | null> {
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

async function fetchMe(): Promise<AuthState> {
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

function deriveYouTubeId(input: string | undefined): string | undefined {
	if (!input) return undefined;

	try {
		// Direct video ID format
		if (/^[A-Za-z0-9_-]{6,}$/i.test(input) && !input.includes("http")) {
			return input;
		}

		const url = new URL(input);

		// YouTube.com URLs
		if (url.hostname.includes("youtube.com")) {
			const vParam = url.searchParams.get("v");
			if (vParam) return vParam;

			// YouTube Shorts
			if (url.pathname.startsWith("/shorts/")) {
				const segments = url.pathname.split("/").filter(Boolean);
				const shortId = segments[1];
				if (shortId) return shortId;
			}
		}

		// youtu.be URLs
		if (input.includes("youtu.be")) {
			const url2 = new URL(input);
			const pathSegment = url2.pathname.replace(/^\//, "");
			if (pathSegment) return pathSegment;
		}

		return undefined;
	} catch (error) {
		console.warn(
			`${DEBUG_LOG_PREFIX} failed to derive YouTube ID from:`,
			input,
			error,
		);
		return undefined;
	}
}

async function postContentActivityFromPlayback(
	evt: PlaybackEvent,
	tabId?: number,
): Promise<ContentActivityResult | null> {
	if (!convex) return null;

	const integrationId = await getIntegrationId();
	if (!integrationId) return null;

	const activityType = evt.event === "progress" ? "heartbeat" : evt.event;
	const contentKey = deriveContentKey(evt);

	if (!contentKey) {
		console.warn(`${DEBUG_LOG_PREFIX} missing contentKey, skipping post`, evt);
		return { ok: false, saved: false };
	}

	const { data: result, error } = await tryCatch(
		convex.mutation(
			api.browserExtensionFunctions.recordContentActivityFromIntegration,
			{
				integrationId,
				source: evt.source,
				activityType,
				contentKey,
				url: evt.url,
				occurredAt: evt.ts,
			},
		),
	);

	if (error) {
		console.warn(`${DEBUG_LOG_PREFIX} failed posting content activity`, error);
		await notifyTabOfError(tabId);
		return null;
	}

	console.log(`${DEBUG_LOG_PREFIX} posted content activity (convex)`, result);

	// Cache label by content key when provided
	cacheContentLabel(result, contentKey);

	// Notify the originating tab for a user-friendly toast only when saved
	if (typeof tabId === "number" && result?.saved) {
		await notifyTabOfSuccess(tabId, evt, result, contentKey);
	}

	return result;
}

function deriveContentKey(evt: PlaybackEvent): string | undefined {
	if (evt.source === "youtube") {
		const id = evt.videoId || deriveYouTubeId(evt.url);
		if (id) return `youtube:${id}`;
	}
	return undefined;
}

async function notifyTabOfError(tabId?: number): Promise<void> {
	if (typeof tabId !== "number") return;

	const { error: notifyError } = await tryCatch(
		chrome.tabs.sendMessage(tabId, {
			type: "CONTENT_ACTIVITY_RECORDED",
			payload: { error: true },
		}),
	);

	if (notifyError) {
		console.warn(
			`${DEBUG_LOG_PREFIX} failed to notify tab of error`,
			notifyError,
		);
	}
}

async function notifyTabOfSuccess(
	tabId: number,
	evt: PlaybackEvent,
	result: ContentActivityResult,
	contentKey: string,
): Promise<void> {
	const { error: notifyError } = await tryCatch(
		chrome.tabs.sendMessage(tabId, {
			type: "CONTENT_ACTIVITY_RECORDED",
			payload: {
				source: evt.source,
				url: evt.url,
				title: evt.title,
				videoId: evt.videoId,
				contentKey: result.contentKey || contentKey,
				occurredAt: evt.ts,
				saved: true,
				contentLabel: result.contentLabel,
				currentTargetLanguage: result.currentTargetLanguage,
			},
		}),
	);

	if (notifyError) {
		console.warn(
			`${DEBUG_LOG_PREFIX} failed to notify tab of success`,
			notifyError,
		);
	}
}

function cacheContentLabel(
	result: ContentActivityResult,
	contentKey: string,
): void {
	const key = result.contentKey || contentKey;
	if (key && result.contentLabel) {
		contentLabelsByKey[key] = result.contentLabel as ContentLabel;
	}
}

// Message handler functions
async function handleRefreshAuth(
	sendResponse?: (response: unknown) => void,
): Promise<void> {
	console.log(`${DEBUG_LOG_PREFIX} REFRESH_AUTH`);

	// Invalidate cache and refetch right away
	lastAuthState = { value: null, fetchedAt: null };

	const { data: auth, error } = await tryCatch(fetchMe());

	if (error) {
		console.error(`${DEBUG_LOG_PREFIX} fetchMe failed:`, error);
		safeSendResponse(sendResponse, { ok: false, error: error.message });
		return;
	}

	console.log(`${DEBUG_LOG_PREFIX} fetchMe success:`, auth);
	lastAuthState = { value: auth, fetchedAt: Date.now() };
	safeSendResponse(sendResponse, { ok: true, auth });
}

async function handleGetAuthState(
	sendResponse?: (response: unknown) => void,
): Promise<void> {
	const now = Date.now();
	console.log(`${DEBUG_LOG_PREFIX} GET_AUTH_STATE`, lastAuthState);

	const isFresh =
		lastAuthState.value &&
		lastAuthState.fetchedAt &&
		now - lastAuthState.fetchedAt < AUTH_CACHE_DURATION_MS;

	if (isFresh) {
		safeSendResponse(sendResponse, lastAuthState.value);
		return;
	}

	const { data: auth, error } = await tryCatch(fetchMe());

	if (error) {
		console.error(`${DEBUG_LOG_PREFIX} fetchMe failed:`, error);
		safeSendResponse(sendResponse, { isAuthed: false, me: null });
		return;
	}

	lastAuthState = { value: auth, fetchedAt: Date.now() };
	safeSendResponse(sendResponse, auth);
}

function handleGetContentLabel(
	message: { contentKey?: string },
	sendResponse?: (response: unknown) => void,
): void {
	const key = message.contentKey;
	const label = key ? contentLabelsByKey[key] : undefined;
	safeSendResponse(sendResponse, { contentLabel: label || null });
}

function handlePlaybackEvent(
	message: { payload?: PlaybackEvent },
	sender: chrome.runtime.MessageSender,
): void {
	const payload = message.payload;
	if (!payload) return;

	console.debug(`${DEBUG_LOG_PREFIX} received PLAYBACK_EVENT`, payload);

	const tabId = sender.tab?.id;
	if (typeof tabId !== "number") return;

	// Send debug ping
	sendDebugPing(tabId, payload);

	// Update tab state
	updateTabState(tabId, payload);

	// Handle content activity posting
	handleContentActivityPosting(tabId, payload);
}

function sendDebugPing(tabId: number, payload: PlaybackEvent): void {
	try {
		chrome.tabs.sendMessage(tabId, {
			type: "DEBUG_PING",
			payload: { seenAt: Date.now(), event: payload.event },
		});
	} catch (error) {
		console.warn(`${DEBUG_LOG_PREFIX} failed to send debug ping:`, error);
	}
}

function updateTabState(tabId: number, payload: PlaybackEvent): void {
	const prev = tabStates[tabId] || { lastEvent: null, isPlaying: false };
	const nextKey = deriveContentKey(payload);
	const contentChanged = nextKey && nextKey !== prev.lastContentKey;

	let newState: TabPlaybackState;

	switch (payload.event) {
		case "start":
			newState = {
				lastEvent: payload,
				isPlaying: true,
				allowPost: !!payload.matchesTarget,
				lastContentKey: nextKey || prev.lastContentKey,
			};
			break;
		case "pause":
		case "end":
			newState = { ...prev, lastEvent: payload, isPlaying: false };
			break;
		case "progress":
			newState = { ...prev, lastEvent: payload, isPlaying: true };
			break;
		default:
			newState = prev;
	}

	// If content changed, reset allowPost until next start decides
	if (contentChanged) {
		newState.lastContentKey = nextKey;
		if (payload.event !== "start") {
			newState.allowPost = undefined;
		}
	}

	tabStates[tabId] = newState;
}

async function handleContentActivityPosting(
	tabId: number,
	payload: PlaybackEvent,
): Promise<void> {
	const state = tabStates[tabId];

	if (payload.event === "start" || state?.allowPost === undefined) {
		console.debug(`${DEBUG_LOG_PREFIX} probing start -> backend detection`);

		const { data: result } = await tryCatch(
			postContentActivityFromPlayback(payload, tabId),
		);

		if (!tabStates[tabId] || !result) return;

		updateAllowPostFromResult(tabId, result);
	} else if (state?.allowPost) {
		console.debug(`${DEBUG_LOG_PREFIX} allowPost -> posting`);
		await postContentActivityFromPlayback(payload, tabId);
	} else {
		console.debug(`${DEBUG_LOG_PREFIX} skip posting (allowPost=false)`);
	}
}

function updateAllowPostFromResult(
	tabId: number,
	result: ContentActivityResult,
): void {
	if (!tabStates[tabId]) return;

	if (result.saved) {
		tabStates[tabId].allowPost = true;
		console.debug(`${DEBUG_LOG_PREFIX} backend says saved -> allowPost=true`);
	} else if (result.reason === "not_target_language") {
		tabStates[tabId].allowPost = false;
		console.debug(
			`${DEBUG_LOG_PREFIX} backend says not target -> allowPost=false`,
		);
	} else if (result.isWaitingOnLabeling) {
		tabStates[tabId].allowPost = true; // keep posting while labeling processes
		console.debug(
			`${DEBUG_LOG_PREFIX} backend waiting on labeling -> allowPost=true`,
		);
	} else {
		// default conservative: do not block
		tabStates[tabId].allowPost = true;
		console.debug(
			`${DEBUG_LOG_PREFIX} backend unknown result -> allowPost=true`,
		);
	}
}

function safeSendResponse(
	sendResponse?: (response: unknown) => void,
	response?: unknown,
): void {
	if (!sendResponse) return;

	try {
		sendResponse(response);
	} catch (error) {
		console.warn(`${DEBUG_LOG_PREFIX} failed to send response:`, error);
	}
}

chrome.runtime.onMessage.addListener((message, sender, _sendResponse) => {
	console.log("onMessage", message);

	if (message && message.type === "REFRESH_AUTH") {
		handleRefreshAuth(_sendResponse);
		return true; // async response
	}
	if (message && message.type === "GET_AUTH_STATE") {
		handleGetAuthState(_sendResponse);
		return true; // async response
	}
	if (message && message.type === "GET_CONTENT_LABEL") {
		handleGetContentLabel(message, _sendResponse);
		return true;
	}
	if (message && message.type === "PLAYBACK_EVENT") {
		handlePlaybackEvent(message, sender);
	}
});

chrome.tabs.onRemoved.addListener((tabId) => {
	handleTabRemoved(tabId);
});

function handleTabRemoved(tabId: number): void {
	const state = tabStates[tabId];
	if (state?.isPlaying && state?.lastEvent) {
		const endEvt: PlaybackEvent = {
			...state.lastEvent,
			event: "end",
			ts: Date.now(),
		};

		console.debug(`${DEBUG_LOG_PREFIX} tab removed, sending end`, {
			tabId,
			endEvt,
		});
		postContentActivityFromPlayback(endEvt);
	}

	delete tabStates[tabId];
}

// When the Integration ID changes, invalidate cached auth state so the next
// GET_AUTH_STATE will fetch fresh data immediately.
chrome.storage.onChanged.addListener((changes, area) => {
	handleStorageChange(changes, area);
});

function handleStorageChange(
	changes: Record<string, chrome.storage.StorageChange>,
	area: string,
): void {
	if (area === "sync" && changes && Object.hasOwn(changes, "integrationId")) {
		console.log(
			`${DEBUG_LOG_PREFIX} integration ID changed, invalidating auth cache`,
		);
		lastAuthState = { value: null, fetchedAt: null };
	}
}
