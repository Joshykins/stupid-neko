// Provider determination logic for browser extension
// This module handles determining which provider to use for a given URL

import { getMetaForUrl } from '../providers/registry';
import type { ProviderName } from './providers/types';
import { sendToTab } from '../../messaging/messagesBackgroundRouter';
import { updateWidgetState } from './widget';
import { getAuthState } from './auth';

import { createLogger } from '../../lib/logger';
const logDefault = createLogger('service-worker', 'providers:default');
const logYoutube = createLogger('service-worker', 'providers:youtube');
const logActivation = createLogger('service-worker', 'providers:activation');
const logDetermine = createLogger('service-worker', 'providers:determine');

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
		const authState = await getAuthState();
		const targetLanguage = authState.me?.languageCode;

		// If default provider, check domain policy (hashed domain allow/block)
		let defaultAllowed = false;
		if (providerId === 'default') {
			try {
				// Avoid re-check if already tracking on the same domain
				const { tabStates } = await import('./content-activity-router');
				const current = tabStates[tabId];
				if (!(current?.isPlaying && current?.currentDomain === domain)) {
					const { checkDomainPolicyAllowed } = await import('./domainPolicy');
					const res = await checkDomainPolicyAllowed(domain);
					if (res) {
						const { updateConsentForDomain } = await import('./content-activity-router');
						// Treat allow policy as implicit consent; block leaves consent false
						updateConsentForDomain(tabId, domain, res.allowed);
						if (res.allowed) {
							defaultAllowed = true;
							const { updateWidgetState } = await import('./widget');
							updateWidgetState({
								state: 'default-provider-tracking',
								provider: 'default',
								domain,
								startTime: Date.now(),
							}, tabId);
						}
					}
				}
			} catch (e) {
				logDefault.debug('domain policy check failed', e);
			}
		}

		// Transition to appropriate provider idle state unless we already started tracking via allow policy
		if (!(providerId === 'default' && defaultAllowed)) {
			transitionFromDeterminingProvider(providerId, domain, tabId);
		}

		// Check if the tab supports content scripts before trying to send messages
		try {
			const tab = await chrome.tabs.get(tabId);
			if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('moz-extension://')) {
				logActivation.debug(`Skipping content script activation for system page: ${tab.url}`);
				return;
			}
		} catch (error) {
			logActivation.debug(`Could not get tab info for ${tabId}: ${String(error)}`);
			return;
		}

		// Activate the provider in the content script with retry
		{
			const logger = providerId === 'default' ? logDefault : providerId === 'youtube' ? logYoutube : undefined;
			logger?.debug('Starting retry activation for provider:', providerId);
		}
		await retryActivateProvider(tabId, providerId, targetLanguage, url);
	} catch (error) {
		logDetermine.warn('failed to determine provider:', error);
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
	const logger = providerId === 'default' ? logDefault : providerId === 'youtube' ? logYoutube : undefined;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			logger?.debug(`Attempting to send ACTIVATE_PROVIDER message (attempt ${attempt}/${maxRetries})`);
			await sendToTab(tabId, 'ACTIVATE_PROVIDER', {
				providerId,
				targetLanguage,
			});

			logger?.debug(`activated provider: ${providerId} for URL: ${url} (attempt ${attempt})`);
			return; // Success!
		} catch (error) {
			const isLastAttempt = attempt === maxRetries;
			const errorMessage = error instanceof Error ? error.message : String(error);

			logger?.debug(`Attempt ${attempt} failed: ${errorMessage}`);

			if (errorMessage.includes('Receiving end does not exist') ||
				errorMessage.includes('Could not establish connection')) {

				if (isLastAttempt) {
					logger?.debug(`Content script not ready for tab ${tabId} after ${maxRetries} attempts: ${errorMessage}`);
					return; // Give up gracefully
				}

				// Wait with exponential backoff before retrying
				const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
				logger?.debug(`Content script not ready, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
				await new Promise(resolve => setTimeout(resolve, delay));
			} else {
				// Non-connection error, don't retry
				logger?.debug(`Failed to activate provider: ${errorMessage}`);
				return;
			}
		}
	}
}
