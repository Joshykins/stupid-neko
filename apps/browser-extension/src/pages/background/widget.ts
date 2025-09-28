// Widget state management for background script

import { getMetaForUrl } from '../providers/registry';
import type {
	WidgetStateUpdate,
	PlaybackEvent,
} from '../../messaging/messages';

const DEBUG_LOG_PREFIX = '[bg:widget]';

// State
let currentWidgetState: WidgetStateUpdate = { state: 'idle' };

export function updateWidgetState(update: WidgetStateUpdate): void {
	console.log(`${DEBUG_LOG_PREFIX} Updating widget state:`, update);
	currentWidgetState = { ...currentWidgetState, ...update };
	console.log(`${DEBUG_LOG_PREFIX} New widget state:`, currentWidgetState);

	// Send state update to all tabs
	chrome.tabs.query({}, tabs => {
		console.log(
			`${DEBUG_LOG_PREFIX} Sending widget state to ${tabs.length} tabs`
		);
		tabs.forEach(tab => {
			if (tab.id) {
				chrome.tabs
					.sendMessage(tab.id, {
						type: 'WIDGET_STATE_UPDATE',
						payload: currentWidgetState,
					})
					.catch(() => {
						// Ignore errors for tabs that don't have content scripts
					});
			}
		});
	});
}

export async function updateWidgetStateForEvent(
	evt: PlaybackEvent,
	tabId: number
): Promise<void> {
	const meta = getMetaForUrl(evt.url);
	const providerName = meta.id;
	const domain = new URL(evt.url).hostname;

	// Import tabStates to check consent
	const { tabStates } = await import('./content-activity-router');
	const tabState = tabStates[tabId];

	// Update state based on event type
	switch (evt.event) {
		case 'start': {
			if (providerName === 'default') {
				// For default provider, check if we have consent
				if (tabState?.hasConsent) {
					updateWidgetState({
						state: 'default-tracking',
						provider: providerName,
						domain,
						startTime: Date.now(),
						metadata: {
							title: evt.title,
							url: evt.url,
						},
					});
				} else {
					// No consent yet, show idle state
					updateWidgetState({
						state: 'idle',
						provider: providerName,
						domain,
						metadata: {
							title: evt.title,
							url: evt.url,
						},
					});
				}
			} else {
				// Non-default providers (like YouTube) work as before
				const stateKey =
					providerName === 'youtube'
						? 'recording-youtube'
						: 'recording-default';
				updateWidgetState({
					state: stateKey,
					provider: providerName,
					domain,
					metadata: {
						title: evt.title,
						videoId: evt.videoId,
					},
				});
			}
			break;
		}

		case 'end':
			updateWidgetState({
				state: 'idle',
			});
			break;

		case 'progress':
			// Keep current state but update metadata if needed
			if (
				currentWidgetState.state.startsWith('recording-') ||
				currentWidgetState.state === 'default-tracking'
			) {
				updateWidgetState({
					state: currentWidgetState.state,
					metadata: {
						...currentWidgetState.metadata,
						title: evt.title,
						videoId: evt.videoId,
					},
				});
			}
			break;
	}
}

export function initializeWidgetState(): void {
	updateWidgetState({
		state: 'idle',
	});
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
			state: 'default-tracking',
			provider: 'default',
			domain,
			startTime: Date.now(),
			metadata: {
				title: tab.title,
				url: tab.url,
			},
		});
	} else {
		// Return to idle
		updateWidgetState({
			state: 'idle',
		});
	}
}

export function handleStopRecording(_tabId: number): void {
	// Stop recording and return to idle
	updateWidgetState({
		state: 'idle',
	});

	// Send end event if there's an active recording
	// Note: This will need access to tabStates from content-activity module
	// We'll handle this in the message handlers
}

export function handleRetry(): void {
	// Reset to idle state
	updateWidgetState({
		state: 'idle',
	});
}

export function getCurrentWidgetState(): WidgetStateUpdate {
	return currentWidgetState;
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
		state: 'default-tracking',
		provider: 'default',
		domain,
		startTime: Date.now(),
		metadata: {
			title: tab.title,
			url: tab.url,
		},
	});
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

	// Check if detected language matches target language
	if (
		targetLanguage &&
		detectedLanguage.startsWith(targetLanguage.toLowerCase())
	) {
		updateWidgetState({
			state: 'prompt-user-for-track',
			provider: 'default',
			domain,
			detectedLanguage,
			metadata: {
				title: tab.title,
				url: tab.url,
			},
		});
	}
}
