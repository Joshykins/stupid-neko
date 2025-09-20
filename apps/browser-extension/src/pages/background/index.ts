// Background scripts cannot render UI; send messages to content for toasts

console.log("background script loaded");

import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { tryCatch } from "../../../../../lib/tryCatch";

const BUILD_CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL;
const BUILD_CONVEX_URL = (import.meta as any)?.env?.VITE_CONVEX_URL as
	| string
	| undefined;
const BUILD_SITE_URL = import.meta.env.VITE_SITE_URL;

try {
	// Helpful to confirm env injection at build time
	// These identifiers are replaced at build via Vite `define`
	// They may be empty strings if not provided
	console.debug("[bg] env check", {
		convexCloud:
			typeof BUILD_CONVEX_URL !== "undefined" ? BUILD_CONVEX_URL : undefined,
		convexSite:
			typeof BUILD_CONVEX_SITE_URL !== "undefined"
				? BUILD_CONVEX_SITE_URL
				: undefined,
		web: typeof BUILD_SITE_URL !== "undefined" ? BUILD_SITE_URL : undefined,
	});
} catch {}

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

const tabStates: Record<number, TabPlaybackState> = {};

// Cache recent labels by content key for quick lookup from content/popup
const contentLabelsByKey: Record<string, any> = {};

// Lightweight auth cache
type AuthMe = {
	name?: string;
	email?: string;
	image?: string;
	username?: string;
	timezone?: string;
	languageCode?: string;
	[key: string]: unknown;
};
type AuthState = { isAuthed: boolean; me: AuthMe | null };
let lastAuthState: { value: AuthState | null; fetchedAt: number | null } = {
	value: null,
	fetchedAt: null,
};

function getEnv(
	name: "CONVEX_URL" | "CONVEX_SITE_URL" | "SITE_URL",
): string | undefined {
	const g: any = globalThis as any;
	const meta: any = import.meta as any;
	// Prefer compile-time injected constants if available
	try {
		if (
			name === "CONVEX_URL" &&
			typeof BUILD_CONVEX_URL !== "undefined" &&
			BUILD_CONVEX_URL
		)
			return BUILD_CONVEX_URL;
	} catch {}
	try {
		if (
			name === "CONVEX_SITE_URL" &&
			typeof BUILD_CONVEX_SITE_URL !== "undefined" &&
			BUILD_CONVEX_SITE_URL
		)
			return BUILD_CONVEX_SITE_URL;
	} catch {}
	try {
		if (
			name === "SITE_URL" &&
			typeof BUILD_SITE_URL !== "undefined" &&
			BUILD_SITE_URL
		)
			return BUILD_SITE_URL;
	} catch {}
	// Fallbacks: Vite env and global shims
	return (
		g[`VITE_${name}`] ||
		meta?.env?.[`VITE_${name}`] ||
		g[name] ||
		meta?.env?.[name]
	);
}

// Convex HTTP client for direct queries/mutations
const CONVEX_URL = getEnv("CONVEX_URL") || getEnv("CONVEX_SITE_URL");
const convex = CONVEX_URL
	? new ConvexHttpClient(CONVEX_URL, {
			// Allow using .convex.site host during development if needed
			skipConvexDeploymentUrlCheck: /\.convex\.site$/i.test(CONVEX_URL),
		} as any)
	: null;

// Integration ID storage helpers
async function getIntegrationId(): Promise<string | null> {
	try {
		const data = await new Promise<Record<string, any>>((resolve) => {
			try {
				chrome.storage.sync.get(["integrationId"], (items) =>
					resolve(items || {}),
				);
			} catch {
				resolve({});
			}
		});
		const id =
			typeof data?.integrationId === "string"
				? data.integrationId.trim()
				: null;
		if (id) return id;
	} catch {}
	return null;
}

async function fetchMe(): Promise<AuthState> {
	const integrationId = await getIntegrationId();
	if (!integrationId || !convex) return { isAuthed: false, me: null };

	const { data: me, error: meError } = await tryCatch(
		convex.query(api.browserExtensionFunctions.meFromIntegration, {
			integrationId,
		}),
	);

	if (meError || !me) return { isAuthed: false, me: null };

	// Mark the integration key as used when successfully authenticated
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
		console.warn("Failed to mark integration key as used:", markError);
	}

	return { isAuthed: true, me: me as any };
}

function deriveYouTubeId(input: string | undefined): string | undefined {
	if (!input) return undefined;
	try {
		if (/^[A-Za-z0-9_-]{6,}$/i.test(input) && !input.includes("http"))
			return input;
		const url = new URL(input);
		if (url.hostname.includes("youtube.com")) {
			const vParam = url.searchParams.get("v");
			if (vParam) return vParam;
			if (url.pathname.startsWith("/shorts/")) {
				const seg = url.pathname.split("/").filter(Boolean)[1];
				if (seg) return seg;
			}
		}
		if (input.includes("youtu.be")) {
			const url2 = new URL(input);
			const seg = url2.pathname.replace(/^\//, "");
			if (seg) return seg;
		}
	} catch {}
	return undefined;
}

type ContentActivityResult = {
	ok: boolean;
	saved: boolean;
	contentActivityId?: string;
	contentLabelId?: string;
	isWaitingOnLabeling?: boolean;
	reason?: string;
	contentKey?: string;
	contentLabel?: any;
	currentTargetLanguage?: { languageCode?: string } | null;
};

async function postContentActivityFromPlayback(
	evt: PlaybackEvent,
	tabId?: number,
): Promise<ContentActivityResult | null> {
	if (!convex) return null;
	const integrationId = await getIntegrationId();
	if (!integrationId) return null;

	const activityType = evt.event === "progress" ? "heartbeat" : evt.event;
	let contentKey: string | undefined;
	if (evt.source === "youtube") {
		const id = evt.videoId || deriveYouTubeId(evt.url);
		if (id) contentKey = `youtube:${id}`;
	}
	if (!contentKey) {
		console.warn("[bg] missing contentKey, skipping post", evt);
		return { ok: false, saved: false } as ContentActivityResult;
	}

	const { data: json, error } = await tryCatch(
		convex.mutation(
			api.browserExtensionFunctions.recordContentActivityFromIntegration,
			{
				integrationId,
				source: evt.source,
				activityType,
				contentKey,
				url: evt.url,
				occurredAt: evt.ts,
			} as any,
		),
	);

	if (error) {
		console.warn("[bg] failed posting content activity", error);
		const { error: notifyError } = await tryCatch(
			chrome.tabs.sendMessage(tabId!, {
				type: "CONTENT_ACTIVITY_RECORDED",
				payload: { error: true },
			}),
		);
		if (notifyError) {
			console.warn("[bg] failed to notify tab of error", notifyError);
		}
		return null;
	}

	console.log("[bg] posted content activity (convex)", json);

	// Cache label by content key when provided
	const key = (json as any)?.contentKey || contentKey;
	if (key && (json as any)?.contentLabel) {
		contentLabelsByKey[key] = (json as any).contentLabel;
	}

	// Notify the originating tab for a user-friendly toast only when saved
	if (typeof tabId === "number" && (json as any)?.saved) {
		const { error: notifyError } = await tryCatch(
			chrome.tabs.sendMessage(tabId, {
				type: "CONTENT_ACTIVITY_RECORDED",
				payload: {
					source: evt.source,
					url: evt.url,
					title: evt.title,
					videoId: evt.videoId,
					contentKey: (json as any).contentKey || contentKey,
					occurredAt: evt.ts,
					saved: true,
					contentLabel: (json as any).contentLabel,
					currentTargetLanguage: (json as any).currentTargetLanguage,
				},
			}),
		);
		if (notifyError) {
			console.warn("[bg] failed to notify tab of success", notifyError);
		}
	}

	return json as any;
}

chrome.runtime.onMessage.addListener((message, sender, _sendResponse) => {
	console.log("onMessage", message);
	// Quick RPCs from content/popup
	if (message && message.type === "REFRESH_AUTH") {
		console.log("[bg] REFRESH_AUTH");
		// Invalidate cache and refetch right away
		lastAuthState = { value: null, fetchedAt: null };
		fetchMe()
			.then((auth) => {
				lastAuthState = { value: auth, fetchedAt: Date.now() };
				try {
					_sendResponse?.({ ok: true, auth });
				} catch (error) {
					console.warn("[bg] failed to send REFRESH_AUTH response", error);
				}
			})
			.catch(() => {
				try {
					_sendResponse?.({ ok: false });
				} catch (error) {
					console.warn(
						"[bg] failed to send REFRESH_AUTH error response",
						error,
					);
				}
			});
		return true; // async response
	}
	if (message && message.type === "GET_AUTH_STATE") {
		const now = Date.now();
		console.log("[bg] GET_AUTH_STATE", lastAuthState);
		const fresh =
			lastAuthState.value &&
			lastAuthState.fetchedAt &&
			now - lastAuthState.fetchedAt < 60_000;
		if (fresh) {
			try {
				_sendResponse?.(lastAuthState.value);
			} catch (error) {
				console.warn("[bg] failed to send cached auth state", error);
			}
			return true;
		}
		fetchMe()
			.then((auth) => {
				lastAuthState = { value: auth, fetchedAt: Date.now() };
				try {
					_sendResponse?.(auth);
				} catch (error) {
					console.warn("[bg] failed to send fresh auth state", error);
				}
			})
			.catch(() => {
				try {
					_sendResponse?.({ isAuthed: false, me: null } as AuthState);
				} catch (error) {
					console.warn("[bg] failed to send auth error state", error);
				}
			});
		return true; // async response
	}
	if (message && message.type === "GET_CONTENT_LABEL") {
		const key = message?.contentKey as string | undefined;
		const label = key ? contentLabelsByKey[key] : undefined;
		try {
			_sendResponse?.({ contentLabel: label || null });
		} catch (error) {
			console.warn("[bg] failed to send content label", error);
			try {
				_sendResponse?.({ contentLabel: null });
			} catch (fallbackError) {
				console.warn(
					"[bg] failed to send fallback content label",
					fallbackError,
				);
			}
		}
		return true;
	}
	if (message && message.type === "PLAYBACK_EVENT") {
		const payload = message.payload as PlaybackEvent;
		try {
			console.debug("[bg] PLAYBACK_EVENT raw", payload);
		} catch {}
		try {
			console.debug("[bg] received PLAYBACK_EVENT", payload);
		} catch {}
		const tabId = sender.tab?.id;
		if (typeof tabId === "number") {
			try {
				chrome.tabs.sendMessage(tabId, {
					type: "DEBUG_PING",
					payload: { seenAt: Date.now(), event: payload.event },
				});
			} catch {}
			const prev =
				tabStates[tabId] ||
				({ lastEvent: null, isPlaying: false } as TabPlaybackState);
			// compute contentKey for comparison
			let nextKey: string | undefined;
			if (payload.source === "youtube") {
				const id = payload.videoId || deriveYouTubeId(payload.url);
				if (id) nextKey = `youtube:${id}`;
			}
			const contentChanged = nextKey && nextKey !== prev.lastContentKey;
			if (payload.event === "start") {
				tabStates[tabId] = {
					lastEvent: payload,
					isPlaying: true,
					allowPost: !!payload.matchesTarget,
					lastContentKey: nextKey || prev.lastContentKey,
				};
			} else if (payload.event === "pause") {
				tabStates[tabId] = { ...prev, lastEvent: payload, isPlaying: false };
			} else if (payload.event === "end") {
				tabStates[tabId] = { ...prev, lastEvent: payload, isPlaying: false };
			} else if (payload.event === "progress") {
				tabStates[tabId] = { ...prev, lastEvent: payload, isPlaying: true };
			} else {
				tabStates[tabId] = prev;
			}
			// If content changed, reset allowPost until next start decides
			if (contentChanged) {
				tabStates[tabId].lastContentKey = nextKey;
				if (payload.event !== "start") {
					tabStates[tabId].allowPost = undefined;
				}
			}
		}
		// Decide posting based on backend detection response on start; then gate others
		const id = sender.tab?.id;
		if (typeof id === "number") {
			const state = tabStates[id] as TabPlaybackState | undefined;
			if (payload.event === "start" || state?.allowPost === undefined) {
				try {
					console.debug("[bg] probing start -> backend detection");
				} catch {}
				postContentActivityFromPlayback(payload, id).then((result) => {
					if (!tabStates[id]) return;
					if (result && result.saved) {
						tabStates[id].allowPost = true;
						try {
							console.debug("[bg] backend says saved -> allowPost=true");
						} catch {}
					} else if (result && result.reason === "not_target_language") {
						tabStates[id].allowPost = false;
						try {
							console.debug("[bg] backend says not target -> allowPost=false");
						} catch {}
					} else if (result && result.isWaitingOnLabeling) {
						tabStates[id].allowPost = true; // keep posting while labeling processes
						try {
							console.debug(
								"[bg] backend waiting on labeling -> allowPost=true",
							);
						} catch {}
					} else {
						// default conservative: do not block
						tabStates[id].allowPost = true;
						try {
							console.debug("[bg] backend unknown result -> allowPost=true");
						} catch {}
					}
				});
			} else {
				if (state && state.allowPost) {
					try {
						console.debug("[bg] allowPost -> posting");
					} catch {}
					postContentActivityFromPlayback(payload, id);
				} else {
					try {
						console.debug("[bg] skip posting (allowPost=false)");
					} catch {}
				}
			}
		}
	}
});

chrome.tabs.onRemoved.addListener((tabId) => {
	const state = tabStates[tabId];
	if (state && state.isPlaying && state.lastEvent) {
		const endEvt: PlaybackEvent = {
			...state.lastEvent,
			event: "end",
			ts: Date.now(),
		};
		try {
			console.debug("[bg] tab removed, sending end", { tabId, endEvt });
		} catch {}
		postContentActivityFromPlayback(endEvt);
	}
	delete tabStates[tabId];
});

// When the Integration ID changes, invalidate cached auth state so the next
// GET_AUTH_STATE will fetch fresh data immediately.
try {
	chrome.storage.onChanged.addListener((changes, area) => {
		if (area === "sync" && changes && Object.hasOwn(changes, "integrationId")) {
			lastAuthState = { value: null, fetchedAt: null };
		}
	});
} catch {}
