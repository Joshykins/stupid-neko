// Base interfaces for the new content provider system

import type { ContentSource } from '../../../../../../convex/schema';

// Provider names - centralized type for all provider identifiers
export type ProviderName = 'youtube' | 'website-provider';

// Helper function to check if a string is a valid provider name
export function isValidProviderName(name: string): name is ProviderName {
	return name === 'youtube' || name === 'website-provider';
}

export interface ContentMetadata {
	title?: string;
	author?: string;
	description?: string;
	duration?: number;
	thumbnail?: string;
	language?: string;
	videoId?: string;
	[key: string]: unknown;
}

export interface ContentActivityEvent {
	source: ContentSource;
	event: 'start' | 'pause' | 'end' | 'progress' | 'language-detected';
	url: string;
	ts: number;
	position?: number;
	duration?: number;
	rate?: number;
	matchesTarget?: boolean;
	metadata?: ContentMetadata;
}

export interface PlaybackState {
	isPlaying: boolean;
	position: number;
	duration: number;
	rate: number;
	metadata: ContentMetadata;
}

/**
 * Base interface for all content providers
 */
export interface ContentProvider {
	readonly name: string;
	readonly supportedDomains: string[];

	/**
	 * Check if this provider can handle the given URL
	 */
	canHandle(url: string): boolean;

	/**
	 * Extract content key from URL (e.g., video ID, article ID)
	 */
	extractContentKey(url: string): string | null;

	/**
	 * Extract metadata from the page
	 */
	extractMetadata(
		url: string,
		document?: Document
	): Promise<ContentMetadata | null>;

	/**
	 * Check if content matches target language (client-side detection)
	 */
	detectTargetLanguage(
		url: string,
		document?: Document,
		targetLanguage?: string
	): Promise<boolean>;

	/**
	 * Whether this provider requires user consent before recording
	 */
	requiresConsent(): boolean;

	/**
	 * Get privacy-friendly description of what will be recorded
	 */
	getRecordingDescription(): string;

	/**
	 * Start tracking content playback
	 * Called when this provider becomes active
	 */
	start(): void;

	/**
	 * Stop tracking content playback
	 * Called when this provider becomes inactive
	 */
	stop(): void;

	/**
	 * Get current playback state
	 */
	getPlaybackState(): PlaybackState | null;

	/**
	 * Set event handlers for this provider
	 */
	setEventHandlers(handlers: {
		onPlaybackEvent: (event: ContentActivityEvent) => void;
		onContentChange?: (metadata: ContentMetadata) => void;
		targetLanguage?: string;
	}): void;
}

/**
 * Provider event types for type safety
 */
export type ProviderEventType =
	| 'playback_start'
	| 'playback_pause'
	| 'playback_end'
	| 'playback_progress'
	| 'content_change'
	| 'navigation';

export interface ProviderEvent {
	type: ProviderEventType;
	timestamp: number;
	data: unknown;
}

/**
 * Configuration for provider event handlers
 */
export interface ProviderEventHandlers {
	onPlaybackEvent: (event: ContentActivityEvent) => void;
	onContentChange?: (metadata: ContentMetadata) => void;
	targetLanguage?: string;
}

// Widget state management
export interface WidgetState {
	state:
		| 'website-provider-idle'
		| 'website-provider-idle-detected'
		| 'website-provider-always-track-question'
		| 'website-provider-tracking'
		| 'website-provider-tracking-stopped'
		| 'website-provider-not-tracking'
		| 'youtube-not-tracking'
		| 'youtube-tracking-unverified'
		| 'youtube-tracking-verified'
		| 'youtube-provider-tracking-stopped'
		| 'content-blocked'
		| 'determining-provider'
		| 'error';
	provider?: ProviderName;
	domain?: string;
	metadata?: ContentMetadata;
	error?: string;
	startTime?: number;
	// Playback/session fields (optional)
	isPlaying?: boolean;
	playbackStatus?: 'playing' | 'paused' | 'ended';
	sessionActiveMs?: number; // accumulated active play time in ms
	sessionStartedAt?: number; // wall-clock ms when current play segment started
	detectedLanguage?: string;
	autoStartedByPolicy?: boolean;
}

export interface WidgetStateUpdate {
	state: WidgetState['state'];
	provider?: ProviderName;
	domain?: string;
	metadata?: ContentMetadata;
	error?: string;
	startTime?: number;
	// Playback/session fields (optional)
	isPlaying?: boolean;
	playbackStatus?: 'playing' | 'paused' | 'ended';
	sessionActiveMs?: number;
	sessionStartedAt?: number;
	detectedLanguage?: string;
	autoStartedByPolicy?: boolean;
}

/**
 * Common interface for content handlers that run in content script context
 */
export interface ContentHandler {
	/**
	 * Start tracking content playback
	 * @param playbackEventCallback - Callback function to receive playback events
	 */
	start: (playbackEventCallback: (event: ContentActivityEvent) => void) => void;

	/**
	 * Stop tracking content playback
	 */
	stop: () => void;

	/**
	 * Get current content metadata
	 */
	getMetadata: () => ContentMetadata;

	/**
	 * Check if the handler is currently active
	 */
	isActive: () => boolean;

	/**
	 * Check if current page matches target language
	 * @param targetLanguage - The user's target language code
	 */
	checkLanguageMatch?: (targetLanguage?: string) => void;
}
