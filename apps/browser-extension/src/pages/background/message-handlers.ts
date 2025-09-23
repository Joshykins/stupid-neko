// Message handlers for background script

import { on } from "../../messaging/messagesBackgroundRouter";
import { getAuthState, refreshAuth } from "./auth";
import { contentLabelsByKey } from "./content-activity-router";
import {
	updateWidgetStateForEvent,
	handleConsentResponse,
	handleStopRecording,
	handleRetry,
	handleLanguageDetection,
	startTrackingFromPopup,
} from "./widget";
import {
	updateTabState,
	handleContentActivityPosting,
	tabStates,
	postContentActivityFromPlayback,
	handleContentActivityEvent,
} from "./content-activity-router";
import type { PlaybackEvent } from "../../messaging/messages";

const DEBUG_LOG_PREFIX = "[bg:handlers]";

export function registerMessageHandlers(): void {
	// Auth handlers
	on("GET_AUTH_STATE", async () => {
		return await getAuthState();
	});

	on("REFRESH_AUTH", async () => {
		return await refreshAuth();
	});

	// Content handlers
	on("GET_CONTENT_LABEL", async ({ contentKey }) => {
		const label = contentKey ? contentLabelsByKey[contentKey] : undefined;
		return { contentLabel: label || null };
	});

	// Popup handlers
	on("START_TRACKING", async (_, sender) => {
		const tabId = sender.tab?.id;
		if (typeof tabId !== "number") {
			return { success: false, error: "Invalid tab ID" };
		}

		try {
			await startTrackingFromPopup(tabId);
			return { success: true };
		} catch (error) {
			console.error(
				`${DEBUG_LOG_PREFIX} failed to start tracking from popup:`,
				error,
			);
			return { success: false, error: String(error) };
		}
	});

	// Widget handlers
	on("WIDGET_ACTION", async ({ action, payload }, sender) => {
		const tabId = sender.tab?.id;
		console.debug(`${DEBUG_LOG_PREFIX} received WIDGET_ACTION`, {
			action,
			payload,
		});

		if (!action || typeof tabId !== "number") {
			return { success: false, error: "Invalid action or tab ID" };
		}

		switch (action) {
			case "consent-response":
				await handleConsentResponse(payload, tabId);
				break;

			case "stop-recording": {
				handleStopRecording(tabId);
				// Send end event if there's an active recording
				const state = tabStates[tabId];
				if (state?.isPlaying && state?.lastEvent) {
					const endEvt: PlaybackEvent = {
						...state.lastEvent,
						event: "end",
						ts: Date.now(),
					};
					postContentActivityFromPlayback(endEvt);
				}
				break;
			}

			case "retry":
				handleRetry();
				break;

			default:
				console.warn(`${DEBUG_LOG_PREFIX} unknown widget action:`, action);
				return { success: false, error: `Unknown widget action: ${action}` };
		}

		return { success: true };
	});

	// Playback handlers
	on("PLAYBACK_EVENT", async ({ payload }, sender) => {
		if (!payload) return {};

		console.debug(`${DEBUG_LOG_PREFIX} received PLAYBACK_EVENT`, payload);

		const tabId = sender.tab?.id;
		if (typeof tabId !== "number") return {};

		// Update widget state based on event
		updateWidgetStateForEvent(payload, tabId);

		// Update tab state
		updateTabState(tabId, payload);

		// Handle content activity posting
		handleContentActivityPosting(tabId, payload);

		return {};
	});

	// Content activity event handler (from content script)
	on("CONTENT_ACTIVITY_EVENT", async ({ payload }, sender) => {
		if (!payload) return {};

		console.debug(
			`${DEBUG_LOG_PREFIX} received CONTENT_ACTIVITY_EVENT`,
			payload,
		);

		const tabId = sender.tab?.id;
		if (typeof tabId !== "number") return {};

		// Handle language detection events
		if (payload.event === "language-detected") {
			const detectedLanguage = payload.metadata?.detectedLanguage as string;
			const targetLanguage = payload.metadata?.targetLanguage as string;
			await handleLanguageDetection(tabId, detectedLanguage, targetLanguage);
		}

		// Handle the content activity event
		await handleContentActivityEvent(tabId, payload);

		return {};
	});
}
