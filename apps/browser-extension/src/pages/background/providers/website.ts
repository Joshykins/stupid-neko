import type {
	ContentActivityEvent,
	ContentHandler,
	ContentMetadata,
} from './types';

// Default content handler - runs in content script context
import { createLogger } from '../../../lib/logger';
const log = createLogger('content', 'providers:website-provider');
let isActive = false;
let startTime: number | null = null;
let activityTimer: number | null = null;

// Event callback
let onPlaybackEvent: ((event: ContentActivityEvent) => void) | null = null;

const getCurrentMetadata = (): ContentMetadata => {
	return {
		title: document.title,
		language: document.documentElement.lang,
		url: location.href,
		hostname: location.hostname,
	};
};

// Simple language detection for target language matching
const detectLanguage = (): string | null => {
	// Check document language attribute
	const docLang = document.documentElement.lang;
	if (docLang) {
		return docLang.toLowerCase();
	}

	// Check meta language tags
	const metaLang = document.querySelector(
		'meta[http-equiv="content-language"]'
	);
	if (metaLang) {
		return metaLang.getAttribute('content')?.toLowerCase() ?? null;
	}

	// Check for language in content (simple heuristic)
	const bodyText = document.body?.textContent || '';
	const titleText = document.title || '';
	const allText = (bodyText + ' ' + titleText).toLowerCase();

	// Simple language detection based on common words/characters
	// This is a basic implementation - could be enhanced with more sophisticated detection
	if (/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(allText)) {
		return 'ja'; // Japanese
	}
	if (/[\u4e00-\u9faf]/.test(allText)) {
		return 'zh'; // Chinese
	}
	if (/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/.test(allText)) {
		return 'ko'; // Korean
	}
	if (
		/[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/.test(
			allText
		)
	) {
		return 'ar'; // Arabic
	}
	if (/[\u0400-\u04ff]/.test(allText)) {
		return 'ru'; // Russian
	}

	return null;
};

const emit = (event: 'start' | 'pause' | 'end' | 'progress'): void => {
	if (!onPlaybackEvent) return;

	const metadata = getCurrentMetadata();
	const payload: ContentActivityEvent = {
		source: 'website',
		event,
		url: location.href,
		ts: Date.now(),
		metadata,
	};

	// Add position/duration for progress events
	if (event === 'progress' && startTime) {
		payload.position = Math.floor((Date.now() - startTime) / 1000);
		payload.duration = Math.floor((Date.now() - startTime) / 1000);
		payload.rate = 1;
	}

	try {
		log.debug('emit', payload);
	} catch {
		// Ignore console errors
	}

	onPlaybackEvent(payload);
};

const setupActivityTracking = (): void => {
	// Disable automatic content-script heartbeats for default provider.
	// Heartbeats will be emitted from the widget while tracking for privacy control.
	if (activityTimer) {
		window.clearInterval(activityTimer);
		activityTimer = null;
	}
};

// Function to check if page matches target language and emit detection event
const checkLanguageMatch = (targetLanguage?: string): void => {
	if (!targetLanguage) return;

	const detectedLang = detectLanguage();
	if (detectedLang?.startsWith(targetLanguage.toLowerCase())) {
		// Emit a special event for language detection
		if (onPlaybackEvent) {
			const metadata = getCurrentMetadata();
			const payload: ContentActivityEvent = {
				source: 'website',
				event: 'language-detected',
				url: location.href,
				ts: Date.now(),
				metadata: {
					...metadata,
					detectedLanguage: detectedLang,
					targetLanguage: targetLanguage,
				},
			};
			onPlaybackEvent(payload);
		}
	}
};

// Public API for content script
export const websiteContentHandler: ContentHandler = {
	start: (playbackEventCallback: (event: ContentActivityEvent) => void) => {
		if (isActive) return;

		onPlaybackEvent = playbackEventCallback;
		isActive = true;
		startTime = Date.now();

		// Emit start event
		emit('start');

		// Set up activity tracking
		setupActivityTracking();
	},

	stop: () => {
		if (!isActive) return;

		isActive = false;

		// Emit end event
		emit('end');

		// Clean up timers
		if (activityTimer) {
			window.clearInterval(activityTimer);
			activityTimer = null;
		}

		startTime = null;
		onPlaybackEvent = null;
	},

	getMetadata: (): ContentMetadata => {
		return getCurrentMetadata();
	},

	isActive: (): boolean => {
		return isActive;
	},

	checkLanguageMatch: (targetLanguage?: string): void => {
		checkLanguageMatch(targetLanguage);
	},
};
