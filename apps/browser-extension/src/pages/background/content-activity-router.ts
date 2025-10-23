import { convex, getIntegrationId, getAuthState } from './auth';
import type { ContentActivityEvent, ProviderName } from './providers/types';
import type { PlaybackEvent } from '../../messaging/messages';
import { tryCatch } from '../../../../../lib/tryCatch';
import { api } from '../../../../../convex/_generated/api';
import { sendToTab } from '../../messaging/messagesBackgroundRouter';
import { createLogger } from '../../lib/logger';
const log = createLogger('service-worker', 'content-activity:router');

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
	ephemeralConsentByDomain?: Record<string, boolean>;
	pausedByDomain?: Record<string, boolean>;
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
	| 'website-provider-tracking'
	| 'youtube-tracking-unverified'
	| 'youtube-tracking-verified';

function isTrackingState(
	state:
		| import('../../messaging/messages').WidgetStateUpdate['state']
		| string
): state is TrackingState {
	return (
		state === 'website-provider-tracking' ||
		state === 'youtube-tracking-unverified' ||
		state === 'youtube-tracking-verified'
	);
}

function deriveContentKey(evt: PlaybackEvent): string | undefined {
	// Prefer explicit videoId for YouTube
	if (evt.source === 'youtube') {
		if (evt.videoId) return `youtube:${evt.videoId}`;
		try {
			const u = new URL(evt.url);
			// Attempt lightweight YouTube ID extraction without importing registry
			if (/(^|\.)youtube\.com$/.test(u.hostname) || /(^|\.)youtu\.be$/.test(u.hostname)) {
				const v = u.searchParams.get('v');
				if (v) return `youtube:${v}`;
				if (u.hostname.includes('youtu.be')) {
					const seg = u.pathname.replace(/^\//, '');
					if (seg) return `youtube:${seg}`;
				}
				if (u.pathname.startsWith('/shorts/')) {
					const segs = u.pathname.split('/').filter(Boolean);
					if (segs[1]) return `youtube:${segs[1]}`;
				}
			}
		} catch {
			/* noop */
			void 0;
		}
		// For YouTube source, don't fall back to website provider - return undefined if no video ID
		return undefined;
	}
	try {
		// Lazy load to avoid pulling provider registry in background paths unnecessarily

		const { extractContentKey } = require('./determineProvider');
		return extractContentKey(evt.url) || undefined;
	} catch {
		try {
			const u = new URL(evt.url);
			return `website:${u.hostname.toLowerCase()}`;
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

	// For website provider, only post heartbeats
	if (evt.source !== 'youtube' && activityType !== 'heartbeat') {
		log.debug('skip non-heartbeat for website provider');
		return { ok: true, saved: false };
	}

	const fn = evt.source === 'youtube'
		? api.browserExtension.youtubeProviderFunctions.recordYoutubeContentActivity
		: api.browserExtension.websiteProviderFunctions.recordWebsiteContentActivity;
	const { data: result, error } = await tryCatch(
		convex.mutation(
			fn,
			{
				integrationId,
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

						const { getProviderName } = require('./determineProvider');
						return getProviderName(evt.url);
					} catch {
						return 'website-provider';
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
	let providerName: ProviderName = 'website-provider';
	try {

		const { getProviderName } = require('./determineProvider');
		providerName = getProviderName(payload.url);
	} catch {
		/* noop */
		void 0;
	}
	const currentDomain = new URL(payload.url).hostname;
	const domainChanged = currentDomain !== prev.currentDomain;

	let newState: TabPlaybackState;

	// Handle domain changes for website provider
	if (domainChanged && providerName === 'website-provider' && prev.isPlaying) {
		// Clear ephemeral consent for the previous domain when leaving it ("Just this time")
		if (prev.currentDomain && prev.ephemeralConsentByDomain?.[prev.currentDomain]) {
			if (prev.consentByDomain) delete prev.consentByDomain[prev.currentDomain];
			if (prev.ephemeralConsentByDomain) delete prev.ephemeralConsentByDomain[prev.currentDomain];
		}

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

				// Activate with retry since content script may not be ready yet
				for (let attempt = 1; attempt <= 5; attempt++) {
					try {
						await sendToTab(tabId, 'ACTIVATE_PROVIDER', { providerId: providerName, targetLanguage });
						log.debug(`re-activated provider: ${providerName} (attempt ${attempt})`);
						break;
					} catch (e: unknown) {
						const msg = e instanceof Error ? e.message : String(e);
						const isConnErr = msg.includes('Receiving end does not exist') || msg.includes('Could not establish connection');
						if (!isConnErr) break;
						if (attempt === 5) {
							log.debug(`Content script not ready for tab ${tabId} after ${attempt} attempts: ${msg}`);
							break;
						}
						const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
						log.debug(`Content script not ready, retrying ACTIVATE_PROVIDER in ${delay}ms (attempt ${attempt}/5)`);
						await new Promise(r => setTimeout(r, delay));
					}
				}
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
	} catch {
		/* noop */
		void 0;
	}

	switch (payload.event) {
		case 'start':
			// Preserve existing per-tab flags (e.g., pausedByDomain, ephemeralConsentByDomain) on start
			newState = {
				...prev,
				lastEvent: payload,
				isPlaying: true,
				// For website provider, always allow posting regardless of matchesTarget
				allowPost: providerName === 'website-provider' ? true : !!payload.matchesTarget,
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
	} catch {
		/* noop */
		void 0;
	}
	let isDefaultProvider = true;
	let isYouTubeProvider = payload.source === 'youtube';
	try {
		const { getProviderName } = require('./determineProvider');
		const name = getProviderName(payload.url);
		isDefaultProvider = name === 'website-provider';
		if (name === 'youtube') isYouTubeProvider = true;
	} catch {
		/* noop */
		void 0;
	}

	// For YouTube provider, always post content activities (never gated by website consent)
	if (isYouTubeProvider) {
		log.debug('YouTube provider -> posting');
		await postContentActivityFromPlayback(payload, tabId);
		return;
	}

	// For website provider, check consent first (include domain policy consent)
	if (isDefaultProvider) {
		const domain = (() => { try { return new URL(payload.url).hostname; } catch { return undefined; } })();
		// Respect per-tab pause override for this domain
		if (domain && state?.pausedByDomain?.[domain]) {
			log.debug('website provider paused by user - skipping post');
			return;
		}
		const effectiveConsent =
			(state?.hasConsent === true) ||
			(!!domain && state?.consentByDomain?.[domain] === true);
		if (!effectiveConsent) {
			log.debug('website provider without consent - skipping post');
			return;
		}
		// Backfill consent/currentDomain if inferred from policy to reduce future skips
		if (domain && state) {
			if (!state.hasConsent) state.hasConsent = true;
			if (!state.currentDomain) state.currentDomain = domain;
			tabStates[tabId] = state;
		}
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
	// Lightweight provider check (avoid requiring determineProvider in SW)
	const host = (() => { try { return new URL(url).hostname.toLowerCase(); } catch { return ''; } })();
	const isYouTube = /(^|\.)youtube\.com$/.test(host) || /(^|\.)youtu\.be$/.test(host);
	if (!isYouTube) return;

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
	} catch {
		/* noop */
		void 0;
	}
	const domain = host || new URL(url).hostname;

	// Determine YouTube state based on result
	let newState: 'youtube-not-tracking' | 'youtube-tracking-unverified' | 'youtube-tracking-verified';
	let contentLanguage: string | undefined;
	let targetLanguage: string | undefined;

	// Prefer explicit contentLabel decision if available
	if (result.contentLabel && result.currentTargetLanguage) {
		const labelObj = result.contentLabel as Record<string, unknown>;
		targetLanguage = result.currentTargetLanguage.languageCode;
		const cl1 = typeof labelObj['contentLanguageCode'] === 'string' ? (labelObj['contentLanguageCode'] as string) : undefined;
		const cl2 = typeof labelObj['languageCode'] === 'string' ? (labelObj['languageCode'] as string) : undefined;
		const cl3 = typeof labelObj['detectedLanguage'] === 'string' ? (labelObj['detectedLanguage'] as string) : undefined;
		contentLanguage = cl1 ?? cl2 ?? cl3;
		log.debug('YouTube language check:', { contentLanguage, targetLanguage, contentLabel: labelObj });
		if (contentLanguage && targetLanguage && contentLanguage === targetLanguage) {
			newState = 'youtube-tracking-verified';
		} else if (contentLanguage && targetLanguage && contentLanguage !== targetLanguage) {
			newState = 'youtube-not-tracking';
		} else {
			// Label present but insufficient language info; treat as unverified
			newState = 'youtube-tracking-unverified';
		}
	} else if (result.reason === 'not_target_language') {
		// Backend decided mismatch even if label payload wasn't included
		newState = 'youtube-not-tracking';
	} else if (result.isWaitingOnLabeling) {
		// Still waiting for content labeling
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
	} else {
		// No content label available yet, keep as unverified
		newState = 'youtube-tracking-unverified';
		log.debug('YouTube state: no content label available');
	}

	log.debug('YouTube state transition:', {
		to: newState,
		contentLanguage,
		targetLanguage,
		isWaitingOnLabeling: result.isWaitingOnLabeling
	});

	updateWidgetState({ state: newState, provider: 'youtube', domain }, tabId);
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
		// website-provider conservative: do not block
		tabStates[tabId].allowPost = true;
		log.debug('backend unknown result -> allowPost=true');
	}
}

export function updateConsentForDomain(
	tabId: number,
	domain: string,
	hasConsent: boolean,
	ephemeral = false
): void {
	const state = tabStates[tabId] || { isPlaying: false, consentByDomain: {} } as TabPlaybackState;
	state.consentByDomain = state.consentByDomain || {};
	state.consentByDomain[domain] = hasConsent;

	// Track ephemeral "track once" consent so we can clear it on domain change
	state.ephemeralConsentByDomain = state.ephemeralConsentByDomain || {};
	if (hasConsent && ephemeral) {
		state.ephemeralConsentByDomain[domain] = true;
	} else {
		delete state.ephemeralConsentByDomain[domain];
	}

	// Update current consent if this is the current domain
	if (state.currentDomain === domain) {
		state.hasConsent = hasConsent;
	}

	tabStates[tabId] = state;
	log.debug('updated consent for domain', { tabId, domain, hasConsent, ephemeral });
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
		const { updateWidgetState, getCurrentWidgetState } = await import('./widget');

		// Preserve per-tab pause for same-domain navigations; only clear when switching domains
		try {
			const state = tabStates[tabId];
			if (state) {
				state.pausedByDomain = state.pausedByDomain || {};
				const prevDomain = state.currentDomain;
				// If switching domains, clear stale pause for the previous domain
				if (prevDomain && prevDomain !== domain && state.pausedByDomain[prevDomain]) {
					delete state.pausedByDomain[prevDomain];
				}
				tabStates[tabId] = state;
			}
		} catch {
			/* noop */
		}

		// Capture previous widget state BEFORE we change domain to avoid cross-domain timer carryover
		const prevWidget = getCurrentWidgetState(tabId);
		log.info('handleUrlChange: enter', { tabId, url, newDomain: domain, prevWidgetDomain: prevWidget?.domain, prevStartTime: prevWidget?.startTime });
		// Enter determining state and explicitly clear any previous startTime to avoid cross-domain carryover,
		// but preserve a stopped state for same-domain navigations
		const isStoppedSameDomain =
			prevWidget?.state === 'website-provider-tracking-stopped' && prevWidget?.domain === domain;
		if (!isStoppedSameDomain) {
			updateWidgetState({ state: 'determining-provider', domain, startTime: undefined }, tabId);
		}

		// Lightweight provider detection without importing registry
		const providerId: ProviderName = (() => {
			try {
				const h = new URL(url).hostname.toLowerCase();
				if (/(^|\.)youtube\.com$/.test(h) || /(^|\.)youtu\.be$/.test(h)) return 'youtube';
			} catch {
				/* noop */
			}
			return 'website-provider';
		})();

		// Clear ephemeral consent when switching away from a domain ("Just this time")
		try {
			const state = tabStates[tabId];
			const prevDomain = state?.currentDomain;
			if (prevDomain && prevDomain !== domain && state?.ephemeralConsentByDomain?.[prevDomain]) {
				if (state.consentByDomain) delete state.consentByDomain[prevDomain];
				if (state.ephemeralConsentByDomain) delete state.ephemeralConsentByDomain[prevDomain];
				// Only adjust hasConsent if we were on that prevDomain
				if (state.currentDomain === prevDomain) state.hasConsent = false;
				tabStates[tabId] = state;
				log.debug('cleared ephemeral consent for previous domain', { tabId, prevDomain });
			}
			// As a fallback, clear any other ephemeral consents not matching the new domain
			try {
				const state = tabStates[tabId];
				if (state?.ephemeralConsentByDomain) {
					for (const d of Object.keys(state.ephemeralConsentByDomain)) {
						if (d !== domain) {
							if (state.consentByDomain) delete state.consentByDomain[d];
							delete state.ephemeralConsentByDomain[d];
							log.debug('cleared stale ephemeral consent for domain', { tabId, domain: d });
						}
					}
					tabStates[tabId] = state;
				}
			} catch {
				/* noop */
			}

		} catch {
			/* noop */
		}

		// Get user's target language
		const authState = await getAuthState();
		const targetLanguage = authState.me?.languageCode;

		// For website provider, check domain policy to possibly auto-track
		let alreadyTracking = false;
		// Respect per-tab consent; ephemeral consent only keeps tracking within the same domain session
		if (providerId === 'website-provider') {
			try {
				const state = tabStates[tabId];
				const hadPersistentConsent = !!state?.consentByDomain?.[domain] && !state?.ephemeralConsentByDomain?.[domain];
				const canContinueEphemeral = !!state?.ephemeralConsentByDomain?.[domain] && state?.currentDomain === domain;
				log.info('handleUrlChange: consent evaluation', { tabId, domain, hadPersistentConsent, canContinueEphemeral });
				if (hadPersistentConsent || canContinueEphemeral) {
					if (state?.pausedByDomain?.[domain]) {
						log.info('handleUrlChange: paused by user - not auto-starting due to consent', { tabId, domain });
					} else {
						const preservedStart = (prevWidget?.domain === domain && prevWidget?.startTime) ? prevWidget.startTime : Date.now();
						updateWidgetState({
							state: 'website-provider-tracking',
							provider: 'website-provider',
							domain,
							startTime: preservedStart,
						}, tabId);
						log.info('handleUrlChange: tracking due to consent', { tabId, domain, preservedStart, reason: hadPersistentConsent ? 'persistent' : 'ephemeral-same-domain' });
						alreadyTracking = true;
					}
				}
			} catch {
				/* noop */
			}
		}

		if (providerId === 'website-provider' && !alreadyTracking) {
			try {
				const { checkDomainPolicyAllowed } = await import('./domainPolicy');
				const res = await checkDomainPolicyAllowed(domain);
				log.info('handleUrlChange: policy check', { tabId, domain, allowed: !!res?.allowed });
				if (res?.allowed) {
					const state = tabStates[tabId] || { consentByDomain: {} };
					state.consentByDomain = state.consentByDomain || {};
					state.consentByDomain[domain] = true;
					if (state.currentDomain === domain) state.hasConsent = true;
					tabStates[tabId] = state;
					if (state?.pausedByDomain?.[domain]) {
						log.info('handleUrlChange: paused by user - not auto-starting due to allow policy', { tabId, domain });
					} else {
						const preservedStart = (prevWidget?.domain === domain && prevWidget?.startTime) ? prevWidget.startTime : Date.now();
						updateWidgetState({
							state: 'website-provider-tracking',
							provider: 'website-provider',
							domain,
							startTime: preservedStart,
							autoStartedByPolicy: true,
						}, tabId);
						log.info('handleUrlChange: tracking due to allow policy', { tabId, domain, preservedStart });
						alreadyTracking = true;
					}
				}
			} catch {
				/* noop */
			}
		}

		// If not already tracking due to consent/policy, set idle unless preserving stopped state
		if (!alreadyTracking) {
			const idleState = providerId === 'youtube' ? 'youtube-tracking-unverified' : 'website-provider-idle';
			log.info('handleUrlChange: entering idle', { tabId, domain, providerId });
			if (!isStoppedSameDomain) {
				updateWidgetState({ state: idleState, provider: providerId, domain }, tabId);
			} else {
				log.info('handleUrlChange: preserving stopped state for domain', { tabId, domain });
			}
		}

		// Activate provider content script with retry (content script might not be ready yet)
		for (let attempt = 1; attempt <= 5; attempt++) {
			try {
				await sendToTab(tabId, 'ACTIVATE_PROVIDER', { providerId, targetLanguage });
				log.debug(`activated provider: ${providerId} (attempt ${attempt})`);
				break;
			} catch (e: unknown) {
				const msg = e instanceof Error ? e.message : String(e);
				const isConnErr = msg.includes('Receiving end does not exist') || msg.includes('Could not establish connection');
				if (!isConnErr) break;
				if (attempt === 5) {
					log.debug(`Content script not ready for tab ${tabId} after ${attempt} attempts: ${msg}`);
					break;
				}
				const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
				log.debug(`Content script not ready, retrying ACTIVATE_PROVIDER in ${delay}ms (attempt ${attempt}/5)`);
				await new Promise(r => setTimeout(r, delay));
			}
		}
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
					currentState.state === 'youtube-provider-tracking-stopped' ||
					currentState.state === 'website-provider-tracking-stopped'
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
		// When tab status becomes 'complete' (including refresh), re-evaluate provider for current URL
		log.debug('Tab completed, checking if provider activation needed');
		try {
			const tab = await chrome.tabs.get(tabId);
			if (tab.url) {
				log.debug('Tab completed with URL, activating provider check');
				await handleUrlChange(tabId, tab.url);
			}
		} catch (error) {
			log.debug('Failed to check tab URL on completion:', error);
		}
	} else {
		log.debug('No URL change detected');
	}
}
