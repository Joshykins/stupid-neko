// Widget state management for background script

import { getMetaForUrl } from './determineProvider';
import type {
	WidgetStateUpdate,
	PlaybackEvent,
} from '../../messaging/messages';
import type { ProviderName } from './providers/types';

const DEBUG_LOG_PREFIX = '[bg:widget]';

// Per-tab widget state management
const tabWidgetStates: Record<number, WidgetStateUpdate> = {};
let currentActiveTabId: number | null = null;

export function updateWidgetState(update: WidgetStateUpdate, tabId?: number): void {
	// If no tabId provided, use the currently active tab
	const targetTabId = tabId || currentActiveTabId;
	if (!targetTabId) {
		console.warn(`${DEBUG_LOG_PREFIX} No active tab to update widget state`);
		return;
	}

	console.log(`${DEBUG_LOG_PREFIX} Updating widget state for tab ${targetTabId}:`, update);
	
	// Update the specific tab's state
	tabWidgetStates[targetTabId] = { ...tabWidgetStates[targetTabId], ...update };
	console.log(`${DEBUG_LOG_PREFIX} New widget state for tab ${targetTabId}:`, tabWidgetStates[targetTabId]);

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
						state: 'default-provider-tracking',
						provider: providerName,
						domain,
						startTime: Date.now(),
						metadata: {
							title: evt.title,
							url: evt.url,
						},
					}, tabId);
				} else {
					// No consent yet, show provider-specific idle state
					updateWidgetState({
						state: 'default-provider-idle',
						provider: providerName,
						domain,
						metadata: {
							title: evt.title,
							url: evt.url,
						},
					}, tabId);
				}
			} else {
				// Non-default providers (like YouTube)
				const stateKey = providerName === 'youtube' ? 'youtube-tracking-unverified' : 'default-provider-tracking';
				updateWidgetState({
					state: stateKey,
					provider: providerName,
					domain,
					startTime: Date.now(),
					metadata: {
						title: evt.title,
						videoId: evt.videoId,
					},
				}, tabId);
			}
			break;
		}

		case 'end':
			// Return to provider-specific idle state
			const idleState = providerName === 'youtube' ? 'youtube-not-tracking' : 'default-provider-idle';
			updateWidgetState({
				state: idleState,
				provider: providerName,
				domain,
			}, tabId);
			break;

		case 'progress':
			// Keep current state but update metadata if needed
			const currentState = tabWidgetStates[tabId];
			if (
				currentState?.state.includes('-tracking') ||
				currentState?.state === 'default-provider-tracking'
			) {
				updateWidgetState({
					state: currentState.state,
					metadata: {
						...currentState.metadata,
						title: evt.title,
						videoId: evt.videoId,
					},
				}, tabId);
			}
			break;
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
			state: 'default-provider-tracking',
			provider: 'default',
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
			state: 'default-provider-idle',
		}, tabId);
	}
}

export function handleStopRecording(tabId: number): void {
    // Stop recording and return to provider-specific idle state
    const current = tabWidgetStates[tabId];
    const provider = current?.provider as ProviderName | undefined;
    const domain = current?.domain;

    const idleState = provider === 'youtube' ? 'youtube-not-tracking' : 'default-provider-idle';

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
	// Reset to default provider idle state
	updateWidgetState({
		state: 'default-provider-idle',
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
		state: 'default-provider-tracking',
		provider: 'default',
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

	// Check if detected language matches target language
	if (
		targetLanguage &&
		detectedLanguage.startsWith(targetLanguage.toLowerCase())
	) {
		updateWidgetState({
			state: 'default-provider-prompt-user-for-track',
			provider: 'default',
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
