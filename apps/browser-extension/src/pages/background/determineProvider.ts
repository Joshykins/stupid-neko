// Provider determination logic for browser extension
// This module handles determining which provider to use for a given URL

import { getMetaForUrl } from '../providers/registry';
import type { ProviderName } from './providers/types';
import { sendToTab } from '../../messaging/messagesBackgroundRouter';
import { updateWidgetState } from './widget';

const DEBUG_LOG_PREFIX = '[bg:determine-provider]';

/**
 * Set the widget state to determining-provider
 * This is called when starting the provider determination process
 */
export function setDeterminingProviderState(domain?: string, tabId?: number): void {
	updateWidgetState({
		state: 'determining-provider',
		domain,
	}, tabId);
}

/**
 * Transition from determining-provider state to the appropriate provider idle state
 * This is called after the provider has been determined
 */
export function transitionFromDeterminingProvider(providerName: ProviderName, domain: string, tabId?: number): void {
	// Transition from determining-provider to appropriate provider idle state
	const idleState = providerName === 'youtube' ? 'youtube-not-tracking' : 'default-provider-idle';
	
	updateWidgetState({
		state: idleState,
		provider: providerName,
		domain,
	}, tabId);
}

/**
 * Determines the appropriate provider for a given URL and handles the transition
 * from determining-provider state to the appropriate provider idle state
 */
export async function determineAndActivateProvider(
	tabId: number,
	url: string
): Promise<void> {
	try {
		const domain = new URL(url).hostname;
		
		// Set determining-provider state while we figure out which provider to use
		setDeterminingProviderState(domain, tabId);

		// Determine which provider to use
		const meta = getMetaForUrl(url);
		const providerId = meta.id;

		// Get user's target language from auth state
		const { getAuthState } = await import('./auth');
		const authState = await getAuthState();
		const targetLanguage = authState.me?.languageCode;

		// Transition to appropriate provider idle state
		transitionFromDeterminingProvider(providerId, domain, tabId);

		// Check if the tab supports content scripts before trying to send messages
		try {
			const tab = await chrome.tabs.get(tabId);
			if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://')) {
				console.debug(`${DEBUG_LOG_PREFIX} Skipping content script activation for system page: ${tab.url}`);
				return;
			}
		} catch (error) {
			console.debug(`${DEBUG_LOG_PREFIX} Could not get tab info for ${tabId}:`, error);
			return;
		}

		// Activate the provider in the content script with retry
		console.debug(`${DEBUG_LOG_PREFIX} Starting retry activation for provider: ${providerId}`);
		await retryActivateProvider(tabId, providerId, targetLanguage, url);
	} catch (error) {
		console.warn(`${DEBUG_LOG_PREFIX} failed to determine provider:`, error);
		throw error;
	}
}

/**
 * Get the provider metadata for a given URL
 * This is a re-export of getMetaForUrl for convenience
 */
export { getMetaForUrl };

/**
 * Extract content key from URL using the appropriate provider
 */
export function extractContentKey(url: string): string | null {
	const meta = getMetaForUrl(url);
	return meta.extractContentKey(url);
}

/**
 * Get the provider name for a given URL
 */
export function getProviderName(url: string): ProviderName {
	const meta = getMetaForUrl(url);
	return meta.id;
}

/**
 * Check if a URL matches a specific provider
 */
export function matchesProvider(url: string, providerId: ProviderName): boolean {
	const meta = getMetaForUrl(url);
	return meta.id === providerId;
}

/**
 * Retry activating a provider in the content script with exponential backoff
 */
async function retryActivateProvider(
	tabId: number,
	providerId: string,
	targetLanguage: string | undefined,
	url: string,
	maxRetries: number = 5
): Promise<void> {
	const { sendToTab } = await import('../../messaging/messagesBackgroundRouter');
	
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				console.debug(`${DEBUG_LOG_PREFIX} Attempting to send ACTIVATE_PROVIDER message (attempt ${attempt}/${maxRetries})`);
				await sendToTab(tabId, 'ACTIVATE_PROVIDER', {
					providerId,
					targetLanguage,
				});

				console.debug(
					`${DEBUG_LOG_PREFIX} activated provider: ${providerId} for URL: ${url} (attempt ${attempt})`
				);
				return; // Success!
			} catch (error) {
				const isLastAttempt = attempt === maxRetries;
				const errorMessage = error instanceof Error ? error.message : String(error);

				console.debug(`${DEBUG_LOG_PREFIX} Attempt ${attempt} failed:`, errorMessage);

				if (errorMessage.includes('Receiving end does not exist') ||
					errorMessage.includes('Could not establish connection')) {

					if (isLastAttempt) {
						console.debug(`${DEBUG_LOG_PREFIX} Content script not ready for tab ${tabId} after ${maxRetries} attempts:`, errorMessage);
						return; // Give up gracefully
					}

					// Wait with exponential backoff before retrying
					const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
					console.debug(`${DEBUG_LOG_PREFIX} Content script not ready, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
					await new Promise(resolve => setTimeout(resolve, delay));
				} else {
					// Non-connection error, don't retry
					console.debug(`${DEBUG_LOG_PREFIX} Failed to activate provider:`, errorMessage);
					return;
				}
			}
		}
}
