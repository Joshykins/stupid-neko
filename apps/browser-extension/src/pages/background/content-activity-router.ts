import { convex, getIntegrationId, getAuthState } from './auth';
import type { ContentActivityEvent, ProviderName } from './providers/types';
import type { PlaybackEvent } from '../../messaging/messages';
import { tryCatch } from '../../../../../lib/tryCatch';
import { api } from '../../../../../convex/_generated/api';
import { sendToTab } from '../../messaging/messagesBackgroundRouter';
import { createLogger } from '../../lib/logger';
const log = createLogger('service-worker', 'content-activity:router');

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
	currentTargetLanguage?: { languageCode?: string; } | null;
};

export type ContentLabel = {
	[key: string]: unknown;
};

// State
export const tabStates: Record<number, TabPlaybackState> = {};
export const contentLabelsByKey: Record<string, ContentLabel> = {};

type TrackingState =
	| 'default-provider-tracking'
	| 'youtube-tracking-unverified'
	| 'youtube-tracking-verified';

function isTrackingState(
	state:
		| import('../../messaging/messages').WidgetStateUpdate['state']
		| string
): state is TrackingState {
	return (
		state === 'default-provider-tracking' ||
		state === 'youtube-tracking-unverified' ||
		state === 'youtube-tracking-verified'
	);
}

function deriveContentKey(evt: PlaybackEvent): string | undefined {
	try {
		// Lazy load to avoid pulling provider registry in background paths unnecessarily
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const { extractContentKey } = require('./determineProvider');
		return extractContentKey(evt.url) || undefined;
	} catch {
		try {
			const u = new URL(evt.url);
			return `website:${u.hostname}${u.pathname}`;
		} catch {
			return undefined;
		}
	}
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
		log.warn('missing contentKey, skipping post', evt);
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
		log.warn('failed posting content activity', error);
		return null;
	}

	log.info('posted content activity (convex)', result);

	// Cache label by content key when provided
	cacheContentLabel(result, contentKey);

	// Handle state transitions based on result (including blocked by policy)
	if (tabId !== undefined) {
		if (result.reason === 'blocked_by_policy') {
			// Show content blocked state and stop tracking
			const { updateWidgetState } = await import('./widget');
			const domain = new URL(evt.url).hostname;
			updateWidgetState({
				state: 'content-blocked',
				provider: (() => {
					try {
						// eslint-disable-next-line @typescript-eslint/no-var-requires
						const { getProviderName } = require('./determineProvider');
						return getProviderName(evt.url);
					} catch {
						return 'default';
					}
				})(),
				domain,
				metadata: {
					title: evt.title,
					url: evt.url,
				},
			}, tabId);
		} else {
			await updateYouTubeStateFromResult(tabId, result, evt.url);
		}
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
	let providerName: ProviderName = 'default';
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const { getProviderName } = require('./determineProvider');
		providerName = getProviderName(payload.url);
	} catch { }
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
					log.debug(`Skipping provider restart for system page: ${tab.url}`);
					return;
				}

				await sendToTab(tabId, 'DEACTIVATE_PROVIDER', {});

				// Get target language if we have consent for this domain
				let targetLanguage: string | undefined;
				if (prev.consentByDomain?.[currentDomain]) {
					const authState = await getAuthState();
					targetLanguage = authState.me?.languageCode;
				}

				await sendToTab(tabId, 'ACTIVATE_PROVIDER', {
					providerId: providerName,
					targetLanguage,
				});
			} catch (error) {
				// This is expected for some tabs, don't treat as error
				log.debug(`Content script not ready for tab ${tabId}: ${String(error)}`);
			}
		}, 100);
	}

	// If widget is showing content-blocked, avoid mutating isPlaying/lastEvent to prevent flicker
	try {
		const { getCurrentWidgetState } = require('./widget');
		const currentWidget = getCurrentWidgetState(tabId);
		if (currentWidget?.state === 'content-blocked') {
			tabStates[tabId] = prev;
			return;
		}
	} catch { }

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
	// Do not post or change state if UI is showing content-blocked
	try {
		const { getCurrentWidgetState } = await import('./widget');
		const current = getCurrentWidgetState(tabId);
		if (current?.state === 'content-blocked') {
			log.debug('skipping posting due to content-blocked');
			return;
		}
	} catch { }
	let isDefaultProvider = true;
	let isYouTubeProvider = false;
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const { getProviderName } = require('./determineProvider');
		const name = getProviderName(payload.url);
		isDefaultProvider = name === 'default';
		isYouTubeProvider = name === 'youtube';
	} catch { }

	// For default provider, check consent first (include domain policy consent)
	if (isDefaultProvider) {
		const domain = (() => { try { return new URL(payload.url).hostname; } catch { return undefined; } })();
		const effectiveConsent =
			(state?.hasConsent === true) ||
			(!!domain && state?.consentByDomain?.[domain] === true);
		if (!effectiveConsent) {
			log.debug('default provider without consent - skipping post');
			return;
		}
		// Backfill consent/currentDomain if inferred from policy to reduce future skips
		if (domain && state) {
			if (!state.hasConsent) state.hasConsent = true;
			if (!state.currentDomain) state.currentDomain = domain;
			tabStates[tabId] = state;
		}
	}

	// For YouTube provider, always post content activities
	if (isYouTubeProvider) {
		log.debug('YouTube provider -> posting');
		await postContentActivityFromPlayback(payload, tabId);
		return;
	}

	if (payload.event === 'start' || state?.allowPost === undefined) {
		log.debug('probing start -> backend detection');

		const { data: result } = await tryCatch(
			postContentActivityFromPlayback(payload, tabId)
		);

		if (!tabStates[tabId] || !result) return;

		updateAllowPostFromResult(tabId, result);
	} else if (state?.allowPost) {
		log.debug('allowPost -> posting');
		await postContentActivityFromPlayback(payload, tabId);
	} else {
		log.debug('skip posting (allowPost=false)');
	}
}

export async function updateYouTubeStateFromResult(
	tabId: number,
	result: ContentActivityResult,
	url: string
): Promise<void> {
	let providerName: ProviderName = 'default';
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const { getProviderName } = require('./determineProvider');
		providerName = getProviderName(url);
	} catch { }
	if (providerName !== 'youtube') return;

	// Import updateWidgetState function
	const { updateWidgetState } = await import('./widget');
	// Do not override a stable stopped state
	try {
		const { getCurrentWidgetState } = await import('./widget');
		const current = getCurrentWidgetState(tabId);
		if (current?.state === 'youtube-provider-tracking-stopped') {
			log.debug('skip YouTube state update due to stopped state');
			return;
		}
	} catch { }
	const domain = new URL(url).hostname;

	// Determine YouTube state based on result
	let newState: 'youtube-not-tracking' | 'youtube-tracking-unverified' | 'youtube-tracking-verified';
	let contentLanguage: string | undefined;
	let targetLanguage: string | undefined;

	if (result.isWaitingOnLabeling) {
		// Still waiting for content labeling
		// Preserve verified if already verified to avoid UI flicker back to analyzing
		try {
			const { getCurrentWidgetState } = await import('./widget');
			const current = getCurrentWidgetState(tabId);
			newState = current.state === 'youtube-tracking-verified'
				? 'youtube-tracking-verified'
				: 'youtube-tracking-unverified';
		} catch {
			newState = 'youtube-tracking-unverified';
		}
		log.debug('YouTube state: waiting for labeling');
	} else if (result.contentLabel && result.currentTargetLanguage) {
		// Check if content label matches target language
		const contentLabel = result.contentLabel as any;
		targetLanguage = result.currentTargetLanguage.languageCode;

		// Check for content language in the contentLabel object
		contentLanguage = contentLabel?.contentLanguageCode || contentLabel?.languageCode || contentLabel?.detectedLanguage;

		log.debug('YouTube language check:', {
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
		log.debug('YouTube state: no content label available');
	}

	log.debug('YouTube state transition:', {
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
		log.debug('backend says saved -> allowPost=true');
	} else if (result.reason === 'not_target_language') {
		tabStates[tabId].allowPost = false;
		log.debug('backend says not target -> allowPost=false');
	} else if (result.isWaitingOnLabeling) {
		tabStates[tabId].allowPost = true; // keep posting while labeling processes
		log.debug('backend waiting on labeling -> allowPost=true');
	} else {
		// default conservative: do not block
		tabStates[tabId].allowPost = true;
		log.debug('backend unknown result -> allowPost=true');
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
		log.debug('updated consent for domain', { tabId, domain, hasConsent });
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

		log.debug('tab removed, sending end', { tabId, endEvt });
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

	log.debug('language detected:', {
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
		const domain = new URL(url).hostname;
		const { updateWidgetState } = await import('./widget');
		// Enter determining state
		updateWidgetState({ state: 'determining-provider', domain }, tabId);

		// Lightweight provider detection without importing registry
		const providerId: ProviderName = (() => {
			try {
				const h = new URL(url).hostname.toLowerCase();
				if (/(^|\.)youtube\.com$/.test(h) || /(^|\.)youtu\.be$/.test(h)) return 'youtube';
			} catch { }
			return 'default';
		})();

		// Get user's target language
		const authState = await getAuthState();
		const targetLanguage = authState.me?.languageCode;

		// For default provider, check domain policy to possibly auto-track
		let alreadyTracking = false;
		if (providerId === 'default') {
			try {
				const { checkDomainPolicyAllowed } = await import('./domainPolicy');
				const res = await checkDomainPolicyAllowed(domain);
				if (res?.allowed) {
					const state = tabStates[tabId] || { consentByDomain: {} };
					state.consentByDomain = state.consentByDomain || {};
					state.consentByDomain[domain] = true;
					if (state.currentDomain === domain) state.hasConsent = true;
					tabStates[tabId] = state;
					updateWidgetState({
						state: 'default-provider-tracking',
						provider: 'default',
						domain,
						startTime: Date.now(),
					}, tabId);
					alreadyTracking = true;
				}
			} catch { }
		}

		// If not already tracking due to allow policy, set idle state
		if (!alreadyTracking) {
			const idleState = providerId === 'youtube' ? 'youtube-not-tracking' : 'default-provider-idle';
			updateWidgetState({ state: idleState, provider: providerId, domain }, tabId);
		}

		// Activate provider content script
		try {
			await sendToTab(tabId, 'ACTIVATE_PROVIDER', { providerId, targetLanguage });
		} catch { }
	} catch (error) {
		log.warn('failed to handle URL change:', error);
	}
}

/**
 * Handle tab activation and set up provider
 */
export async function handleTabActivated(tabId: number): Promise<void> {
	try {
		log.debug('handleTabActivated called for tab:', tabId);

		// Set this tab as the active tab for widget state management
		const { setActiveTab } = await import('./widget');
		setActiveTab(tabId);

		const tab = await chrome.tabs.get(tabId);
		if (tab.url) {
			log.debug('Tab activated with URL:', tab.url);
			// If we're already in a tracking or blocked state for this tab, avoid resetting the widget state
			// by re-determining the provider. This prevents flicker and re-verification.
			try {
				const { getCurrentWidgetState } = await import('./widget');
				const currentState = getCurrentWidgetState(tabId);
				if (
					isTrackingState(currentState.state) ||
					currentState.state === 'content-blocked' ||
					currentState.state === 'youtube-provider-tracking-stopped'
				) {
					log.debug(`Tab already in stable state (${currentState.state}) -> skipping provider re-determination`);
					return;
				}
			} catch (e) {
				// If anything goes wrong, fall back to normal behavior
				log.debug('Could not read current widget state:', e);
			}

			await handleUrlChange(tabId, tab.url);
		} else {
			log.debug('Tab activated but no URL found');
		}
	} catch (error) {
		log.warn('failed to handle tab activation:', error);
	}
}

/**
 * Handle tab updates (URL changes, etc.)
 */
export async function handleTabUpdated(
	tabId: number,
	changeInfo: { url?: string; status?: string; }
): Promise<void> {
	log.debug('handleTabUpdated called:', { tabId, changeInfo });
	if (changeInfo.url) {
		log.debug('URL changed to:', changeInfo.url);
		await handleUrlChange(tabId, changeInfo.url);
	} else if (changeInfo.status === 'complete') {
		// When tab status becomes 'complete', check if we need to activate a provider
		log.debug('Tab completed, checking if provider activation needed');
		try {
			const tab = await chrome.tabs.get(tabId);
			if (tab.url && tab.url.includes('youtube.com')) {
				log.debug('YouTube tab completed, activating provider');
				await handleUrlChange(tabId, tab.url);
			}
		} catch (error) {
			log.debug('Failed to check tab URL on completion:', error);
		}
	} else {
		log.debug('No URL change detected');
	}
}
