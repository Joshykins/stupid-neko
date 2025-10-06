// Widget state management for background script

import type {
	WidgetStateUpdate,
	PlaybackEvent,
} from '../../messaging/messages';
import type { ProviderName } from './providers/types';

import { createLogger } from '../../lib/logger';
const log = createLogger('service-worker', 'widget:state-updates');


// Per-tab widget state management
const tabWidgetStates: Record<number, WidgetStateUpdate> = {};
let currentActiveTabId: number | null = null;

export function updateWidgetState(update: WidgetStateUpdate, tabId?: number): void {
	// If no tabId provided, use the currently active tab
	const targetTabId = tabId || currentActiveTabId;
	if (!targetTabId) {
		log.warn('No active tab to update widget state');
		return;
	}

	// Compute next state to decide log level
	const prevState = tabWidgetStates[targetTabId];
	const nextState = { ...prevState, ...update };
	const stateChanged =
		prevState?.state !== nextState.state ||
		prevState?.provider !== nextState.provider ||
		prevState?.domain !== nextState.domain;
	if (stateChanged) {
		log.info(`Updating widget state for tab ${targetTabId}:`, update);
		log.info(`New widget state for tab ${targetTabId}:`, nextState);
	} else {
		log.debug(`Widget metadata update for tab ${targetTabId}:`, update);
	}
	// Apply the new state
	tabWidgetStates[targetTabId] = nextState;

	// Send state update only to the specific tab
	chrome.tabs
		.sendMessage(targetTabId, {
			type: 'WIDGET_STATE_UPDATE',
			payload: tabWidgetStates[targetTabId],
		})
		.catch(() => {
			// Ignore errors for tabs that don't have content scripts
		});
}

export async function updateWidgetStateForEvent(
	evt: PlaybackEvent,
	tabId: number
): Promise<void> {
	// Do not override a blocked state with transient playback events
	const current = tabWidgetStates[tabId];
	if (current?.state === 'content-blocked') {
		log.debug('ignoring event due to content-blocked state', evt);
		return;
	}
	// Treat provider "tracking-stopped" states as stable; ignore transient events
	if (
		current?.state === 'youtube-provider-tracking-stopped' ||
		current?.state === 'website-provider-tracking-stopped'
	) {
		log.debug('ignoring event due to provider-tracking-stopped state', {
			state: current?.state,
			evt,
		});
		return;
	}
	// Lightweight provider detection without importing registry to avoid document usage in background
	const host = (() => { try { return new URL(evt.url).hostname.toLowerCase(); } catch { return ''; } })();
	const providerName: ProviderName = /(^|\.)youtube\.com$/.test(host) || /(^|\.)youtu\.be$/.test(host)
		? 'youtube'
		: 'website-provider';
	const domain = new URL(evt.url).hostname;

	// Import tabStates to check consent
	const { tabStates } = await import('./content-activity-router');
	const tabState = tabStates[tabId];

	// Update state based on event type
	switch (evt.event) {
		case 'start': {
			if (providerName === 'website-provider') {
				// For website provider, check if we are paused for this domain or have consent
				const isPaused = !!tabState?.pausedByDomain?.[domain];
				if (isPaused) {
					log.debug('widget:start suppressed due to pausedByDomain', { tabId, domain });
					// Keep or set a stable stopped state to avoid UI flicker back to tracking
					const prev = tabWidgetStates[tabId];
					if (prev?.state !== 'website-provider-tracking-stopped') {
						updateWidgetState({
							state: 'website-provider-tracking-stopped',
							provider: providerName,
							domain,
							metadata: { title: evt.title, url: evt.url },
						}, tabId);
					}
					return;
				}
				if (tabState?.hasConsent) {
					const prev = tabWidgetStates[tabId];
					// Only preserve the timer if both the widget's previous domain and the tabState's currentDomain match this domain.
					// This prevents resuming an old timer when returning to a domain after visiting another domain.
					const sameDomainSession = (prev?.domain === domain) && (tabState?.currentDomain === domain);
					const preservedStart = (sameDomainSession && prev?.startTime) ? prev.startTime : Date.now();
					log.debug('widget:start website-provider', { tabId, prevDomain: prev?.domain, tabStatePrevDomain: tabState?.currentDomain, newDomain: domain, prevStartTime: prev?.startTime, preservedStart, sameDomainSession });
					updateWidgetState({
						state: 'website-provider-tracking',
						provider: providerName,
						domain,
						startTime: preservedStart,
						metadata: {
							title: evt.title,
							url: evt.url,
						},
					}, tabId);
				} else {
					// No consent yet, show provider-specific idle state
					updateWidgetState({
						state: 'website-provider-idle',
						provider: providerName,
						domain,
						metadata: {
							title: evt.title,
							url: evt.url,
						},
					}, tabId);
				}
			} else {
				// YouTube provider
				const prev = tabWidgetStates[tabId];
				const keepStable =
					prev?.state === 'youtube-tracking-verified' ||
					prev?.state === 'youtube-not-tracking';
				const sameVideo = (prev as any)?.metadata?.videoId === evt.videoId;
				const now = Date.now();
				updateWidgetState({
					state: keepStable ? (prev!.state) : 'youtube-tracking-unverified',
					provider: providerName,
					domain,
					startTime: sameVideo ? (prev?.startTime ?? now) : now,
					// start/resume playing
					isPlaying: true,
					playbackStatus: 'playing',
					sessionActiveMs: sameVideo ? (prev?.sessionActiveMs ?? 0) : 0,
					sessionStartedAt: now,
					metadata: {
						title: evt.title,
						videoId: evt.videoId,
					},
				}, tabId);
			}
			break;
		}

		case 'pause': {
			// For YouTube keep verified state but mark paused and stop session timer
			if (providerName === 'youtube') {
				const prev = tabWidgetStates[tabId];
				const now = Date.now();
				const accumulated = (prev?.sessionActiveMs ?? 0) + (prev?.sessionStartedAt ? now - prev.sessionStartedAt : 0);
				updateWidgetState({
					state: (prev?.state ?? 'youtube-tracking-unverified'),
					provider: providerName,
					domain,
					isPlaying: false,
					playbackStatus: 'paused',
					sessionActiveMs: accumulated,
					sessionStartedAt: undefined,
				}, tabId);
				break;
			}
			// non-YouTube fallthrough: keep existing behavior (if any)
			break;
		}

		case 'end': {
			if (providerName === 'youtube') {
				const prev = tabWidgetStates[tabId];
				const now = Date.now();
				const accumulated = (prev?.sessionActiveMs ?? 0) + (prev?.sessionStartedAt ? now - prev.sessionStartedAt : 0);
				updateWidgetState({
					state: (prev?.state ?? 'youtube-tracking-unverified'),
					provider: providerName,
					domain,
					isPlaying: false,
					playbackStatus: 'ended',
					sessionActiveMs: accumulated,
					sessionStartedAt: undefined,
				}, tabId);
				break;
			}
			// Default previous idle behavior for non-YouTube
			const idleState = 'website-provider-not-tracking';
			updateWidgetState({
				state: idleState,
				provider: providerName,
				domain,
			}, tabId);
			break;
		}

		case 'progress': {
			// Keep current state but update metadata; for YouTube also treat progress as resume/start signal
			const currentState = tabWidgetStates[tabId];
			if (!currentState) break;

			const isTracking =
				currentState?.state.includes('-tracking') ||
				currentState?.state === 'website-provider-tracking';

			if (isTracking) {
				if (currentState.provider === 'youtube') {
					const prevVideoId = (currentState as any)?.metadata?.videoId as string | undefined;
					const isNewVideo = !!evt.videoId && evt.videoId !== prevVideoId;
					const now = Date.now();

					updateWidgetState({
						state: currentState.state,
						provider: currentState.provider,
						domain,
						// If video changed, start a fresh session; else if previously not playing, resume timer
						...(isNewVideo
							? {
								startTime: now,
								isPlaying: true,
								playbackStatus: 'playing',
								sessionActiveMs: 0,
								sessionStartedAt: now,
							}
							: currentState.playbackStatus !== 'playing'
								? {
									isPlaying: true,
									playbackStatus: 'playing',
									sessionStartedAt: now,
								}
								: {}),
						metadata: {
							...(currentState.metadata || {}),
							title: evt.title,
							videoId: evt.videoId,
						},
					}, tabId);
				} else {
					updateWidgetState({
						state: currentState.state,
						metadata: {
							...currentState.metadata,
							title: evt.title,
							videoId: evt.videoId,
						},
					}, tabId);
				}
			}
			break;
		}
	}
}

export function initializeWidgetState(): void {
	// Initialize with a default state for new tabs
	// This will be overridden when tabs are activated
}

export async function handleConsentResponse(
	payload: Record<string, unknown> | undefined,
	tabId: number
): Promise<void> {
	const consent = payload?.consent as boolean;
	if (typeof consent !== 'boolean') return;

	// Get current tab URL to determine domain
	const tab = await chrome.tabs.get(tabId);
	if (!tab.url) return;

	const domain = new URL(tab.url).hostname;

	// Import functions to update consent
	const { updateConsentForDomain } = await import('./content-activity-router');
	updateConsentForDomain(tabId, domain, consent);

	if (consent) {
		// Start tracking with consent
		updateWidgetState({
			state: 'website-provider-tracking',
			provider: 'website-provider',
			domain,
			startTime: Date.now(),
			metadata: {
				title: tab.title,
				url: tab.url,
			},
		}, tabId);
	} else {
		// Return to default provider idle
		updateWidgetState({
			state: 'website-provider-idle',
		}, tabId);
	}
}

export function handleStopRecording(tabId: number): void {
	// Stop recording and return to provider-specific idle state
	const current = tabWidgetStates[tabId];
	const provider = current?.provider as ProviderName | undefined;
	const domain = current?.domain;

	const idleState = provider === 'youtube' ? 'youtube-tracking-unverified' : 'website-provider-idle';

	updateWidgetState({
		state: idleState,
		provider,
		domain,
	}, tabId);

	// Send end event if there's an active recording
	// Note: This will need access to tabStates from content-activity module
	// We'll handle this in the message handlers
}

export function handleRetry(tabId?: number): void {
	// Reset to website provider idle state
	updateWidgetState({
		state: 'website-provider-idle',
	}, tabId);
}

export function getCurrentWidgetState(tabId?: number): WidgetStateUpdate {
	const targetTabId = tabId || currentActiveTabId;
	if (!targetTabId) {
		return { state: 'determining-provider' };
	}
	return tabWidgetStates[targetTabId] || { state: 'determining-provider' };
}

export async function startTrackingFromPopup(tabId: number): Promise<void> {
	// Get current tab URL to determine domain
	const tab = await chrome.tabs.get(tabId);
	if (!tab.url) return;

	const domain = new URL(tab.url).hostname;

	// Import functions to update consent
	const { updateConsentForDomain } = await import('./content-activity-router');
	updateConsentForDomain(tabId, domain, true);

	// Start tracking with consent
	updateWidgetState({
		state: 'website-provider-tracking',
		provider: 'website-provider',
		domain,
		startTime: Date.now(),
		metadata: {
			title: tab.title,
			url: tab.url,
		},
	}, tabId);
}

export async function handleLanguageDetection(
	tabId: number,
	detectedLanguage: string,
	targetLanguage?: string
): Promise<void> {
	// Get current tab URL to determine domain
	const tab = await chrome.tabs.get(tabId);
	if (!tab.url) return;

	const domain = new URL(tab.url).hostname;

	// Only prompt when in idle/determining; do not override stable tracking or blocked states
	const current = getCurrentWidgetState(tabId);
	const canPrompt =
		current.state === 'website-provider-idle' ||
		current.state === 'determining-provider';

	if (!canPrompt) {
		log.debug('Skipping language-detected prompt due to stable state', {
			tabId,
			currentState: current.state,
			domain,
		});
		return;
	}

	// Check if detected language matches target language
	if (
		targetLanguage &&
		detectedLanguage.toLowerCase().startsWith(targetLanguage.toLowerCase())
	) {
		updateWidgetState({
			state: 'website-provider-idle-detected',
			provider: 'website-provider',
			domain,
			detectedLanguage,
			metadata: {
				title: tab.title,
				url: tab.url,
			},
		}, tabId);
	}
}

/**
 * Set the currently active tab and send its widget state
 */
export function setActiveTab(tabId: number): void {
	currentActiveTabId = tabId;

	// Initialize widget state for this tab if it doesn't exist
	if (!tabWidgetStates[tabId]) {
		tabWidgetStates[tabId] = { state: 'determining-provider' };
	}

	// Send the current state to the newly active tab
	chrome.tabs
		.sendMessage(tabId, {
			type: 'WIDGET_STATE_UPDATE',
			payload: tabWidgetStates[tabId],
		})
		.catch(() => {
			// Ignore errors for tabs that don't have content scripts
		});
}

/**
 * Clean up widget state when a tab is closed
 */
export function cleanupTabState(tabId: number): void {
	delete tabWidgetStates[tabId];

	// If this was the active tab, clear the active tab
	if (currentActiveTabId === tabId) {
		currentActiveTabId = null;
	}
}
