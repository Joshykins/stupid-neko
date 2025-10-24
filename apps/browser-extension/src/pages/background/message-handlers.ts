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
} from './content-activity-router';
import type { TabPlaybackState } from './content-activity-router';
import type {
	PlaybackEvent,
	WidgetStateUpdate,
} from '../../messaging/messages';
import { tryCatch } from '../../../../../lib/tryCatch';
import { updateWidgetState } from './widget';
import { getDomainContentKey } from './domainPolicy';
import { createLogger } from '../../lib/logger';
const log = createLogger('service-worker', 'handlers:bg');

export function registerMessageHandlers(): void {
	// Auth handlers
	on('GET_AUTH_STATE', async () => {
		return await getAuthState();
	});

	on('REFRESH_AUTH', async () => {
		return await refreshAuth();
	});

	on('GET_USER_PROGRESS', async () => {
		const integrationId = await getIntegrationId();
		if (!integrationId || !convex) {
			return { success: false, error: 'Not authenticated' };
		}

		const { data: progress, error } = await tryCatch(
			convex.query(
				api.browserExtension.browserExtensionCoreFunctions
					.getUserProgressFromIntegration,
				{
					integrationId,
				}
			)
		);

		if (error) {
			log.error('Failed to fetch user progress:', error);
			return { success: false, error: error.message };
		}

		return { success: true, data: progress };
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
				updateWidgetState(
					{ state: 'website-provider-always-track-question' },
					tabId
				);
				break;
			}

			case 'dont-track': {
				const { updateWidgetState } = await import('./widget');
				updateWidgetState({ state: 'website-provider-not-tracking' }, tabId);
				break;
			}

			case 'question-track-once': {
				try {
					const tab = await chrome.tabs.get(tabId);
					const url = tab.url || '';
					const domain = url ? new URL(url).hostname : undefined;
					if (domain) {
						log.info('question-track-once: clicked', { tabId, domain, url });

						// Clear pausedByDomain flag since user explicitly wants to track
						const state = tabStates[tabId] || {};
						if (state.pausedByDomain?.[domain]) {
							delete state.pausedByDomain[domain];
							tabStates[tabId] = state;
							log.info('question-track-once: cleared pausedByDomain flag', {
								tabId,
								domain,
							});
						}

						const { updateConsentForDomain } = await import(
							'./content-activity-router'
						);
						updateConsentForDomain(tabId, domain, true, true);

						const { updateWidgetState, getCurrentWidgetState } = await import(
							'./widget'
						);
						const prev = getCurrentWidgetState(tabId);
						const preservedStart =
							prev?.domain === domain && prev?.startTime
								? prev.startTime
								: Date.now();

						updateWidgetState(
							{
								state: 'website-provider-tracking',
								provider: 'website-provider',
								domain,
								startTime: preservedStart,
								metadata: { title: tab.title, url },
							},
							tabId
						);
						log.info('question-track-once: set tracking', {
							tabId,
							domain,
							preservedStart,
						});

						const authState = await getAuthState();
						await sendToTab(tabId, 'ACTIVATE_PROVIDER', {
							providerId: 'website-provider',
							targetLanguage: authState.me?.languageCode,
						});
						log.info('question-track-once: activated provider', {
							tabId,
							domain,
						});
					}
				} catch (e) {
					log.warn('track-once flow failed:', e);
				}
				break;
			}

			case 'question-always-track': {
				// Create a domain-level ALLOW policy using domain contentKey
				try {
					const tab = await chrome.tabs.get(tabId);
					const url = tab.url || '';
					const domain = url ? new URL(url).hostname : undefined;
					if (domain) {
						const contentKey = getDomainContentKey(domain);
						const integrationId = await getIntegrationId();
						if (convex && integrationId) {
							const { error } = await tryCatch(
								convex.mutation(
									api.browserExtension.websiteProviderFunctions
										.markWebsiteAsAlwaysTrack,
									{
										integrationId,
										contentKey,
										url,
										label: domain,
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

						// Clear pausedByDomain flag since user explicitly wants to always track
						if (state.pausedByDomain?.[domain]) {
							delete state.pausedByDomain[domain];
							log.info('question-always-track: cleared pausedByDomain flag', {
								tabId,
								domain,
							});
						}

						tabStates[tabId] = state;

						// Update widget immediately
						const { getCurrentWidgetState } = await import('./widget');
						const current = getCurrentWidgetState(tabId);
						const preservedStart =
							current?.domain === domain && current?.startTime
								? current.startTime
								: Date.now();
						updateWidgetState(
							{
								state: 'website-provider-tracking',
								startTime: preservedStart,
								provider: 'website-provider',
								domain,
								metadata: { title: tab.title, url },
							},
							tabId
						);
						log.info('question-always-track: set tracking', {
							tabId,
							domain,
							preservedStart,
						});

						// Activate provider in content script
						const authState = await getAuthState();
						await sendToTab(tabId, 'ACTIVATE_PROVIDER', {
							providerId: 'website-provider',
							targetLanguage: authState.me?.languageCode,
						});
					}
				} catch (e) {
					log.warn('always-track flow failed:', e);
				}
				break;
			}

			case 'track-anyway': {
				const { updateWidgetState, getCurrentWidgetState } = await import(
					'./widget'
				);
				const current = getCurrentWidgetState(tabId);
				if (current.provider === 'youtube') {
					// Clear any per-domain pause flag and reactivate the YouTube provider so events resume
					try {
						const state = (tabStates[tabId] || {}) as Record<string, unknown>;
						const urlStr = state?.lastEvent?.url as string | undefined;
						const derivedDomain = (() => {
							try {
								return urlStr ? new URL(urlStr).hostname : undefined;
							} catch {
								return undefined;
							}
						})();
						const domain =
							derivedDomain || (current?.domain as string | undefined);
						if (domain) {
							const pbd =
								(state['pausedByDomain'] as
									| Record<string, boolean>
									| undefined) || {};
							if (domain in pbd) {
								delete pbd[domain as string];
							}
							state['pausedByDomain'] = pbd;
							tabStates[tabId] = state as unknown as TabPlaybackState;
						}
					} catch {
						/* noop */
						void 0;
					}
					updateWidgetState(
						{ state: 'youtube-tracking-verified', startTime: Date.now() },
						tabId
					);
					try {
						const authState = await getAuthState();
						await sendToTab(tabId, 'ACTIVATE_PROVIDER', {
							providerId: 'youtube',
							targetLanguage: authState.me?.languageCode,
						});
					} catch {
						/* noop */
						void 0;
					}
				} else {
					updateWidgetState(
						{ state: 'website-provider-always-track-question' },
						tabId
					);
				}
				break;
			}
			case 'consent-response':
				await handleConsentResponse(payload, tabId);
				break;

			case 'block-content': {
				const state = tabStates[tabId];
				const last = state?.lastEvent;
				if (!last) break;
				// Derive provider and content key locally to avoid dynamic imports in Service Worker
				let providerId: 'youtube' | 'website-provider' = 'website-provider';
				let contentKey: string | null = null;
				try {
					const u = new URL(last.url);
					const host = u.hostname.toLowerCase();
					const isYouTube =
						/(^|\.)youtube\.com$/.test(host) || /(^|\.)youtu\.be$/.test(host);
					if (isYouTube) {
						providerId = 'youtube';
						const v = u.searchParams.get('v');
						if (v) {
							contentKey = `youtube:${v}`;
						} else if (host.includes('youtu.be')) {
							const seg = u.pathname.replace(/^\//, '');
							if (seg) contentKey = `youtube:${seg}`;
						} else if (u.pathname.startsWith('/shorts/')) {
							const segs = u.pathname.split('/').filter(Boolean);
							if (segs[1]) contentKey = `youtube:${segs[1]}`;
						}
					}
				} catch {
					/* noop */
				}
				const integrationId = await getIntegrationId();
				if (!(convex && integrationId)) break;
				if (providerId === 'youtube' && contentKey) {
					const { error } = await tryCatch(
						convex.mutation(
							api.browserExtension.youtubeProviderFunctions
								.markYoutubeVideoAsBlocked,
							{
								integrationId,
								contentKey,
								url: last.url,
								label: state?.lastEvent?.title,
							}
						)
					);
					if (error) {
						log.error('failed to create block policy for content:', error);
					} else {
						// Move widget to content-blocked state on success
						const { updateWidgetState } = await import('./widget');
						let domain = '';
						try {
							domain = new URL(last.url).hostname;
						} catch {
							/* noop */
						}
						updateWidgetState(
							{
								state: 'content-blocked',
								provider: 'youtube',
								domain,
								metadata: { title: state?.lastEvent?.title, url: last.url },
							},
							tabId
						);
					}
				} else {
					log.warn(
						'block-content: unsupported provider or missing contentKey',
						{ tabId, url: last.url, providerId, contentKey }
					);
				}
				try {
					await sendToTab(tabId, 'DEACTIVATE_PROVIDER', {});
				} catch {
					/* noop */
					void 0;
				}

				break;
			}

			case 'stop-recording': {
				// Stop current tracking session and mark paused for this domain in this tab
				handleStopRecording(tabId);
				const state = (tabStates[tabId] || {}) as Record<string, unknown>;
				try {
					const { getCurrentWidgetState } = await import('./widget');
					const current = getCurrentWidgetState(tabId);
					const urlStr = state?.lastEvent?.url as string | undefined;
					const derivedDomain = (() => {
						try {
							return urlStr ? new URL(urlStr).hostname : undefined;
						} catch {
							return undefined;
						}
					})();
					const domain =
						derivedDomain || (current?.domain as string | undefined);
					if (domain) {
						state.pausedByDomain = state.pausedByDomain || {};
						state.pausedByDomain[domain] = true;
						tabStates[tabId] = state;
					}
				} catch {
					/* noop */
					void 0;
				}
				// Deactivate provider in content script to stop emitting further events
				try {
					await sendToTab(tabId, 'DEACTIVATE_PROVIDER', {});
				} catch {
					/* noop */
					void 0;
				}
				// Update widget state to provider-specific stopped card and preserve last known title/url
				const { updateWidgetState, getCurrentWidgetState } = await import(
					'./widget'
				);
				const current = getCurrentWidgetState(tabId);
				const stateKey: WidgetStateUpdate['state'] =
					current.provider === 'youtube'
						? 'youtube-provider-tracking-stopped'
						: 'website-provider-tracking-stopped';
				updateWidgetState(
					{
						state: stateKey,
						metadata: {
							title: state?.lastEvent?.title,
							url: state?.lastEvent?.url,
						},
					},
					tabId
				);
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
