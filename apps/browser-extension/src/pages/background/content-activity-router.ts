import { convex, getIntegrationId } from './auth';
import type { ContentActivityEvent, ProviderName } from './providers/types';
import type { PlaybackEvent } from '../../messaging/messages';
import { tryCatch } from '../../../../../lib/tryCatch';
import { api } from '../../../../../convex/_generated/api';
import { getMetaForUrl, extractContentKey, getProviderName } from './determineProvider';
import { sendToTab } from '../../messaging/messagesBackgroundRouter';

const DEBUG_LOG_PREFIX = '[bg:content-router]';

// Types
export type TabPlaybackState = {
	lastEvent: PlaybackEvent | null;
	isPlaying: boolean;
	allowPost?: boolean;
	lastContentKey?: string;
	currentProvider?: ProviderName;
	hasConsent?: boolean;
	startTime?: number;
	detectedLanguage?: string;
	currentDomain?: string;
	consentByDomain?: Record<string, boolean>;
};

export type ContentActivityResult = {
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

export type ContentLabel = {
	[key: string]: unknown;
};

// State
export const tabStates: Record<number, TabPlaybackState> = {};
export const contentLabelsByKey: Record<string, ContentLabel> = {};

function deriveContentKey(evt: PlaybackEvent): string | undefined {
	return extractContentKey(evt.url) || undefined;
}

export async function postContentActivityFromPlayback(
	evt: PlaybackEvent,
	tabId?: number
): Promise<ContentActivityResult | null> {
	if (!convex) return null;

	const integrationId = await getIntegrationId();
	if (!integrationId) return null;

	const activityType = evt.event === 'progress' ? 'heartbeat' : evt.event;
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
			}
		)
	);

	if (error) {
		console.warn(`${DEBUG_LOG_PREFIX} failed posting content activity`, error);
		return null;
	}

	console.log(`${DEBUG_LOG_PREFIX} posted content activity (convex)`, result);

	// Cache label by content key when provided
	cacheContentLabel(result, contentKey);

	// Handle YouTube state transitions based on result
	if (tabId !== undefined) {
		await updateYouTubeStateFromResult(tabId, result, evt.url);
	}

	return result;
}

export function cacheContentLabel(
	result: ContentActivityResult,
	contentKey: string
): void {
	const key = result.contentKey || contentKey;
	if (key && result.contentLabel) {
		contentLabelsByKey[key] = result.contentLabel as ContentLabel;
	}
}

export function updateTabState(tabId: number, payload: PlaybackEvent): void {
	const prev = tabStates[tabId] || {
		lastEvent: null,
		isPlaying: false,
		consentByDomain: {},
	};
	const nextKey = deriveContentKey(payload);
	const contentChanged = nextKey && nextKey !== prev.lastContentKey;
	const providerName = getProviderName(payload.url);
	const currentDomain = new URL(payload.url).hostname;
	const domainChanged = currentDomain !== prev.currentDomain;

	let newState: TabPlaybackState;

	// Handle domain changes for default provider
	if (domainChanged && providerName === 'default' && prev.isPlaying) {
		// Stop current session and emit end event
		if (prev.lastEvent) {
			const endEvt: PlaybackEvent = {
				...prev.lastEvent,
				event: 'end',
				ts: Date.now(),
			};
			postContentActivityFromPlayback(endEvt);
		}

		// Restart the provider for the new domain
		setTimeout(async () => {
			try {
				// Check if the tab supports content scripts before trying to send messages
				const tab = await chrome.tabs.get(tabId);
				if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://')) {
					console.debug(`${DEBUG_LOG_PREFIX} Skipping provider restart for system page: ${tab.url}`);
					return;
				}

				await sendToTab(tabId, 'DEACTIVATE_PROVIDER', {});

				// Get target language if we have consent for this domain
				let targetLanguage: string | undefined;
				if (prev.consentByDomain?.[currentDomain]) {
					const { getAuthState } = await import('./auth');
					const authState = await getAuthState();
					targetLanguage = authState.me?.languageCode;
				}

				await sendToTab(tabId, 'ACTIVATE_PROVIDER', {
					providerId: providerName,
					targetLanguage,
				});
			} catch (error) {
				// This is expected for some tabs, don't treat as error
				console.debug(
					`${DEBUG_LOG_PREFIX} Content script not ready for tab ${tabId}:`,
					error
				);
			}
		}, 100);
	}

	switch (payload.event) {
		case 'start':
			newState = {
				lastEvent: payload,
				isPlaying: true,
				allowPost: !!payload.matchesTarget,
				lastContentKey: nextKey || prev.lastContentKey,
				currentProvider: providerName,
				currentDomain,
				consentByDomain: prev.consentByDomain || {},
				// Check consent for current domain
				hasConsent: prev.consentByDomain?.[currentDomain] || false,
			};
			break;
		case 'pause':
		case 'end':
			newState = {
				...prev,
				lastEvent: payload,
				isPlaying: false,
				currentDomain,
			};
			break;
		case 'progress':
			newState = {
				...prev,
				lastEvent: payload,
				isPlaying: true,
				currentDomain,
			};
			break;
		default:
			newState = { ...prev, currentDomain };
	}

	// If content changed, reset allowPost until next start decides
	if (contentChanged) {
		newState.lastContentKey = nextKey;
		newState.currentProvider = providerName;
		if (payload.event !== 'start') {
			newState.allowPost = undefined;
		}
	}

	tabStates[tabId] = newState;
}

export async function handleContentActivityPosting(
	tabId: number,
	payload: PlaybackEvent
): Promise<void> {
	const state = tabStates[tabId];
	const isDefaultProvider = getProviderName(payload.url) === 'default';
	const isYouTubeProvider = getProviderName(payload.url) === 'youtube';

	// For default provider, check consent first
	if (isDefaultProvider && !state?.hasConsent) {
		console.debug(
			`${DEBUG_LOG_PREFIX} default provider without consent - skipping post`
		);
		return;
	}

	// For YouTube provider, always post content activities
	if (isYouTubeProvider) {
		console.debug(`${DEBUG_LOG_PREFIX} YouTube provider -> posting`);
		await postContentActivityFromPlayback(payload, tabId);
		return;
	}

	if (payload.event === 'start' || state?.allowPost === undefined) {
		console.debug(`${DEBUG_LOG_PREFIX} probing start -> backend detection`);

		const { data: result } = await tryCatch(
			postContentActivityFromPlayback(payload, tabId)
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

export async function updateYouTubeStateFromResult(
	tabId: number,
	result: ContentActivityResult,
	url: string
): Promise<void> {
	const providerName = getProviderName(url);
	if (providerName !== 'youtube') return;

	// Import updateWidgetState function
	const { updateWidgetState } = await import('./widget');
	const domain = new URL(url).hostname;
	
	// Determine YouTube state based on result
	let newState: 'youtube-not-tracking' | 'youtube-tracking-unverified' | 'youtube-tracking-verified';
	let contentLanguage: string | undefined;
	let targetLanguage: string | undefined;
	
	if (result.isWaitingOnLabeling) {
		// Still waiting for content labeling
		newState = 'youtube-tracking-unverified';
		console.debug(`${DEBUG_LOG_PREFIX} YouTube state: waiting for labeling`);
	} else if (result.contentLabel && result.currentTargetLanguage) {
		// Check if content label matches target language
		const contentLabel = result.contentLabel as any;
		targetLanguage = result.currentTargetLanguage.languageCode;
		
		// Check for content language in the contentLabel object
		contentLanguage = contentLabel?.contentLanguageCode || contentLabel?.languageCode || contentLabel?.detectedLanguage;
		
		console.debug(`${DEBUG_LOG_PREFIX} YouTube language check:`, {
			contentLanguage,
			targetLanguage,
			contentLabel: contentLabel
		});
		
		if (contentLanguage === targetLanguage) {
			newState = 'youtube-tracking-verified';
		} else {
			newState = 'youtube-not-tracking';
		}
	} else {
		// No content label available yet, keep as unverified
		newState = 'youtube-tracking-unverified';
		console.debug(`${DEBUG_LOG_PREFIX} YouTube state: no content label available`);
	}

	console.debug(`${DEBUG_LOG_PREFIX} YouTube state transition:`, {
		from: 'current state',
		to: newState,
		contentLanguage,
		targetLanguage,
		isWaitingOnLabeling: result.isWaitingOnLabeling
	});

	updateWidgetState({
		state: newState,
		provider: 'youtube',
		domain,
	}, tabId);
}

export function updateAllowPostFromResult(
	tabId: number,
	result: ContentActivityResult
): void {
	if (!tabStates[tabId]) return;

	if (result.saved) {
		tabStates[tabId].allowPost = true;
		console.debug(`${DEBUG_LOG_PREFIX} backend says saved -> allowPost=true`);
	} else if (result.reason === 'not_target_language') {
		tabStates[tabId].allowPost = false;
		console.debug(
			`${DEBUG_LOG_PREFIX} backend says not target -> allowPost=false`
		);
	} else if (result.isWaitingOnLabeling) {
		tabStates[tabId].allowPost = true; // keep posting while labeling processes
		console.debug(
			`${DEBUG_LOG_PREFIX} backend waiting on labeling -> allowPost=true`
		);
	} else {
		// default conservative: do not block
		tabStates[tabId].allowPost = true;
		console.debug(
			`${DEBUG_LOG_PREFIX} backend unknown result -> allowPost=true`
		);
	}
}

export function updateConsentForDomain(
	tabId: number,
	domain: string,
	hasConsent: boolean
): void {
	const state = tabStates[tabId];
	if (state) {
		state.consentByDomain = state.consentByDomain || {};
		state.consentByDomain[domain] = hasConsent;

		// Update current consent if this is the current domain
		if (state.currentDomain === domain) {
			state.hasConsent = hasConsent;
		}

		tabStates[tabId] = state;
		console.debug(`${DEBUG_LOG_PREFIX} updated consent for domain`, {
			tabId,
			domain,
			hasConsent,
		});
	}
}

export function handleTabRemoved(tabId: number): void {
	const state = tabStates[tabId];
	if (state?.isPlaying && state?.lastEvent) {
		const endEvt: PlaybackEvent = {
			...state.lastEvent,
			event: 'end',
			ts: Date.now(),
		};

		console.debug(`${DEBUG_LOG_PREFIX} tab removed, sending end`, {
			tabId,
			endEvt,
		});
		postContentActivityFromPlayback(endEvt);
	}

	// Clean up widget state for this tab
	import('./widget').then(({ cleanupTabState }) => {
		cleanupTabState(tabId);
	});

	delete tabStates[tabId];
}

/**
 * Handle language detection events
 */
export function handleLanguageDetection(
	tabId: number,
	event: ContentActivityEvent
): void {
	const state = tabStates[tabId];
	if (!state) return;

	// Update state with detected language
	state.detectedLanguage = event.metadata?.detectedLanguage as string;
	tabStates[tabId] = state;

	console.debug(`${DEBUG_LOG_PREFIX} language detected:`, {
		tabId,
		detectedLanguage: state.detectedLanguage,
		targetLanguage: event.metadata?.targetLanguage,
	});
}

/**
 * Handle content activity events from content script
 */
export async function handleContentActivityEvent(
	tabId: number,
	event: ContentActivityEvent
): Promise<void> {
	// Handle language detection events separately
	if (event.event === 'language-detected') {
		handleLanguageDetection(tabId, event);
		return;
	}

	// Convert ContentActivityEvent to PlaybackEvent format
	const playbackEvent: PlaybackEvent = {
		source: event.source,
		event: event.event,
		url: event.url,
		ts: event.ts,
		position: event.position,
		duration: event.duration,
		rate: event.rate,
		matchesTarget: event.matchesTarget,
		title: event.metadata?.title,
		videoId: event.metadata?.videoId,
	};

	// Update tab state and handle posting
	updateTabState(tabId, playbackEvent);
	await handleContentActivityPosting(tabId, playbackEvent);
}

/**
 * Handle URL changes and activate the appropriate provider
 */
export async function handleUrlChange(
	tabId: number,
	url: string
): Promise<void> {
	try {
		const { determineAndActivateProvider } = await import('./determineProvider');
		await determineAndActivateProvider(tabId, url);
	} catch (error) {
		console.warn(`${DEBUG_LOG_PREFIX} failed to handle URL change:`, error);
	}
}

/**
 * Handle tab activation and set up provider
 */
export async function handleTabActivated(tabId: number): Promise<void> {
	try {
		console.debug(`${DEBUG_LOG_PREFIX} handleTabActivated called for tab:`, tabId);
		
		// Set this tab as the active tab for widget state management
		const { setActiveTab } = await import('./widget');
		setActiveTab(tabId);
		
		const tab = await chrome.tabs.get(tabId);
		if (tab.url) {
			console.debug(`${DEBUG_LOG_PREFIX} Tab activated with URL:`, tab.url);
			await handleUrlChange(tabId, tab.url);
		} else {
			console.debug(`${DEBUG_LOG_PREFIX} Tab activated but no URL found`);
		}
	} catch (error) {
		console.warn(`${DEBUG_LOG_PREFIX} failed to handle tab activation:`, error);
	}
}

/**
 * Handle tab updates (URL changes, etc.)
 */
export async function handleTabUpdated(
	tabId: number,
	changeInfo: { url?: string; status?: string }
): Promise<void> {
	console.debug(`${DEBUG_LOG_PREFIX} handleTabUpdated called:`, { tabId, changeInfo });
	if (changeInfo.url) {
		console.debug(`${DEBUG_LOG_PREFIX} URL changed to:`, changeInfo.url);
		await handleUrlChange(tabId, changeInfo.url);
	} else if (changeInfo.status === 'complete') {
		// When tab status becomes 'complete', check if we need to activate a provider
		console.debug(`${DEBUG_LOG_PREFIX} Tab completed, checking if provider activation needed`);
		try {
			const tab = await chrome.tabs.get(tabId);
			if (tab.url && tab.url.includes('youtube.com')) {
				console.debug(`${DEBUG_LOG_PREFIX} YouTube tab completed, activating provider`);
				await handleUrlChange(tabId, tab.url);
			}
		} catch (error) {
			console.debug(`${DEBUG_LOG_PREFIX} Failed to check tab URL on completion:`, error);
		}
	} else {
		console.debug(`${DEBUG_LOG_PREFIX} No URL change detected`);
	}
}
