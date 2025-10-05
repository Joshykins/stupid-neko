// Message handlers for background script

import { on, sendToTab } from '../../messaging/messagesBackgroundRouter';
import { api } from '../../../../../convex/_generated/api';
import { convex, getIntegrationId, getAuthState, refreshAuth } from './auth';
import { contentLabelsByKey } from './content-activity-router';
import {
	updateWidgetStateForEvent,
	handleConsentResponse,
	handleStopRecording,
	handleRetry,
	handleLanguageDetection,
	startTrackingFromPopup,
} from './widget';
import {
	updateTabState,
	handleContentActivityPosting,
	tabStates,
	postContentActivityFromPlayback,
	handleContentActivityEvent,
	updateConsentForDomain,
} from './content-activity-router';
import type { PlaybackEvent, WidgetStateUpdate } from '../../messaging/messages';
import { tryCatch } from '../../../../../lib/tryCatch';
import { updateWidgetState } from './widget';
import { getHashedDomainContentKey } from './domainPolicy';
import { createLogger } from '../../lib/logger';
const log = createLogger('service-worker', 'handlers:bg');

const DEBUG_LOG_PREFIX = '[bg:handlers]';

export function registerMessageHandlers(): void {
	// Auth handlers
	on('GET_AUTH_STATE', async () => {
		return await getAuthState();
	});

	on('REFRESH_AUTH', async () => {
		return await refreshAuth();
	});

	// Content handlers
	on('GET_CONTENT_LABEL', async ({ contentKey }) => {
		const label = contentKey ? contentLabelsByKey[contentKey] : undefined;
		return { contentLabel: label || null };
	});

	// Popup handlers
	on('START_TRACKING', async (_, sender) => {
		const tabId = sender.tab?.id;
		if (typeof tabId !== 'number') {
			return { success: false, error: 'Invalid tab ID' };
		}

		try {
			await startTrackingFromPopup(tabId);
			return { success: true };
		} catch (error) {
			log.error('failed to start tracking from popup:', error);
			return { success: false, error: String(error) };
		}
	});

	// Widget state handlers
	on('GET_WIDGET_STATE', async (_, sender) => {
		const tabId = sender.tab?.id;
		const { getCurrentWidgetState } = await import('./widget');
		return getCurrentWidgetState(tabId);
	});

	// Widget handlers
	on('WIDGET_ACTION', async ({ action, payload }, sender) => {
		const tabId = sender.tab?.id;
		log.debug('received WIDGET_ACTION', { action, payload });

		if (!action || typeof tabId !== 'number') {
			return { success: false, error: 'Invalid action or tab ID' };
		}

		// Normalize provider-scoped actions like "youtube.stop-recording" or "default.dont-track"
		const normalizedAction = action.includes('.')
			? action.split('.').slice(1).join('.')
			: action;

		switch (normalizedAction) {
			case 'open-always-track-question': {
				const { updateWidgetState } = await import('./widget');
				updateWidgetState({ state: 'default-provider-always-track-question' }, tabId);
				break;
			}

			case 'dont-track': {
				const { updateWidgetState } = await import('./widget');
				updateWidgetState({ state: 'default-provider-not-tracking' }, tabId);
				break;
			}

			case 'question-track-once': {
				const { updateWidgetState } = await import('./widget');
				updateWidgetState({ state: 'default-provider-tracking', startTime: Date.now() }, tabId);
				break;
			}

			case 'question-always-track': {
				// Create a domain-level ALLOW policy using hashed domain contentKey
				try {
					const tab = await chrome.tabs.get(tabId);
					const url = tab.url || '';
					const domain = url ? new URL(url).hostname : undefined;
					if (domain) {
						const contentKey = await getHashedDomainContentKey(domain);
						const integrationId = await getIntegrationId();
						if (convex && integrationId) {
							const { error } = await tryCatch(
								convex.mutation(
									api.browserExtensionFunctions.createUserContentLabelPolicyFromIntegration,
									{
										integrationId,
										contentKey,
										source: 'website',
										url,
										label: domain,
										policyKind: 'allow',
									}
								)
							);
							if (error) {
								log.warn('failed to create allow policy for domain:', error);
							}
						}
						// DB is authoritative; no cache update needed
						// Set consent inline
						const state = tabStates[tabId] || { consentByDomain: {} };
						state.consentByDomain = state.consentByDomain || {};
						state.consentByDomain[domain] = true;
						if (state.currentDomain === domain) state.hasConsent = true;
						tabStates[tabId] = state;

						// Update widget immediately
						updateWidgetState({
							state: 'default-provider-tracking',
							startTime: Date.now(),
							provider: 'default',
							domain,
							metadata: { title: tab.title, url },
						}, tabId);

						// Activate provider in content script
						const authState = await getAuthState();
						await sendToTab(tabId, 'ACTIVATE_PROVIDER', {
							providerId: 'default',
							targetLanguage: authState.me?.languageCode,
						});
					}
				} catch (e) {
					log.warn('always-track flow failed:', e);
				}
				break;
			}

			case 'track-anyway': {
				const { updateWidgetState, getCurrentWidgetState } = await import('./widget');
				const current = getCurrentWidgetState(tabId);
				if (current.provider === 'youtube') {
					updateWidgetState({ state: 'youtube-tracking-verified', startTime: Date.now() }, tabId);
				} else {
					updateWidgetState({ state: 'default-provider-always-track-question' }, tabId);
				}
				break;
			}
			case 'consent-response':
				await handleConsentResponse(payload, tabId);
				break;

			case 'block-content': {
				// Create a user content label blocking policy for current content and stop recording
				const state = tabStates[tabId];
				const last = state?.lastEvent;
				if (!last) break;
				const { extractContentKey, getProviderName } = await import('./determineProvider');
				const contentKey = extractContentKey(last.url);
				if (contentKey) {
					const integrationId = await getIntegrationId();
					if (convex && integrationId) {
						const { error } = await tryCatch(
							convex.mutation(
								api.browserExtensionFunctions.createUserContentLabelPolicyFromIntegration,
								{
									integrationId,
									contentKey,
									source: (() => {
										const p = getProviderName(last.url);
										return p === 'default' ? 'website' : (p as 'youtube' | 'spotify' | 'anki' | 'manual' | 'website');
									})(),
									url: last.url,
									label: state?.lastEvent?.title,
									policyKind: 'block',
								}
							)
						);
						if (error) {
							log.error('failed to create block policy for content:', error);
						}
					}
				}
				// Stop recording after creating block policy
				handleStopRecording(tabId);
				// Show content blocked state with metadata
				{
					const { updateWidgetState } = await import('./widget');
					updateWidgetState({
						state: 'content-blocked',
						metadata: {
							title: state?.lastEvent?.title,
							url: state?.lastEvent?.url,
						},
					}, tabId);
				}
				if (state?.isPlaying && state?.lastEvent) {
					const endEvt: PlaybackEvent = {
						...state.lastEvent,
						event: 'end',
						ts: Date.now(),
					};
					postContentActivityFromPlayback(endEvt);
				}
				break;
			}

			case 'stop-recording': {
				handleStopRecording(tabId);
				const { updateWidgetState, getCurrentWidgetState } = await import('./widget');
				const current = getCurrentWidgetState(tabId);
				const stateKey: WidgetStateUpdate['state'] = current.provider === 'youtube'
					? 'youtube-provider-tracking-stopped'
					: 'default-provider-tracking-stopped';
				// Preserve last known title/url as subtitle metadata for stopped state
				const state = tabStates[tabId];
				updateWidgetState({
					state: stateKey,
					metadata: {
						title: state?.lastEvent?.title,
						url: state?.lastEvent?.url,
					},
				}, tabId);
				// Send end event if there's an active recording
				if (state?.isPlaying && state?.lastEvent) {
					const endEvt: PlaybackEvent = {
						...state.lastEvent,
						event: 'end',
						ts: Date.now(),
					};
					postContentActivityFromPlayback(endEvt);
				}
				break;
			}

			case 'retry':
				handleRetry(tabId);
				break;

			default:
				log.warn('unknown widget action:', action);
				return { success: false, error: `Unknown widget action: ${action}` };
		}

		return { success: true };
	});


	// Playback handlers
	on('PLAYBACK_EVENT', async ({ payload }, sender) => {
		if (!payload) return {};

		log.debug('received PLAYBACK_EVENT', payload);

		const tabId = sender.tab?.id;
		if (typeof tabId !== 'number') return {};

		// Update widget state based on event
		updateWidgetStateForEvent(payload, tabId);

		// Update tab state
		updateTabState(tabId, payload);

		// Handle content activity posting
		handleContentActivityPosting(tabId, payload);

		return {};
	});

	// Content activity event handler (from content script)
	on('CONTENT_ACTIVITY_EVENT', async ({ payload }, sender) => {
		if (!payload) return {};

		log.debug('received CONTENT_ACTIVITY_EVENT', payload);

		const tabId = sender.tab?.id;
		if (typeof tabId !== 'number') return {};

		// Handle language detection events
		if (payload.event === 'language-detected') {
			const detectedLanguage = payload.metadata?.detectedLanguage as string;
			const targetLanguage = payload.metadata?.targetLanguage as string;
			await handleLanguageDetection(tabId, detectedLanguage, targetLanguage);
		}

		// Handle the content activity event
		await handleContentActivityEvent(tabId, payload);

		// Update widget state based on the event (only for playback events, not language-detected)
		if (payload.event !== 'language-detected') {
			// Convert ContentActivityEvent to PlaybackEvent format for widget state update
			const playbackEvent: PlaybackEvent = {
				source: payload.source,
				event: payload.event,
				url: payload.url,
				ts: payload.ts,
				position: payload.position,
				duration: payload.duration,
				rate: payload.rate,
				matchesTarget: payload.matchesTarget,
				title: payload.metadata?.title,
				videoId: payload.metadata?.videoId,
			};
			updateWidgetStateForEvent(playbackEvent, tabId);
		}

		return {};
	});
}
