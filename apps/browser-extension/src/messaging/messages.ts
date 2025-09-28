// messaging/contract.ts

import type { ContentSource } from '../../../../convex/schema';
import type { ContentActivityEvent } from '../pages/background/providers/types';

// Map each message key to its request & response shapes.
// Keep this tiny and colocated so both sides import it.
export type MessageMap = {
	// Auth messages
	GET_AUTH_STATE: {
		req: Record<string, never>;
		res: { isAuthed: boolean; me: AuthMe | null };
	};

	REFRESH_AUTH: {
		req: Record<string, never>;
		res: {
			ok: boolean;
			auth?: { isAuthed: boolean; me: AuthMe | null };
			error?: string;
		};
	};

	// Content messages
	GET_CONTENT_LABEL: {
		req: { contentKey: string };
		res: { contentLabel: unknown };
	};

	// Widget messages
	WIDGET_ACTION: {
		req: { action: string; payload?: Record<string, unknown> };
		res: { success: boolean; error?: string };
	};

	// Popup messages
	START_TRACKING: {
		req: Record<string, never>;
		res: { success: boolean; error?: string };
	};

	WIDGET_STATE_UPDATE: {
		req: { payload: WidgetStateUpdate };
		res: Record<string, never>;
	};

	// Playback messages
	PLAYBACK_EVENT: {
		req: { payload: PlaybackEvent };
		res: Record<string, never>;
	};

	CONTENT_ACTIVITY_EVENT: {
		req: { payload: ContentActivityEvent };
		res: Record<string, never>;
	};

	// Lifecycle messages (BG -> content)
	ACTIVATE_PROVIDER: {
		req: { providerId: string; targetLanguage?: string };
		res: Record<string, never>;
	};
	DEACTIVATE_PROVIDER: {
		req: Record<string, never>;
		res: Record<string, never>;
	};
};

// Type definitions for message payloads
export type AuthMe = {
	name?: string;
	email?: string;
	image?: string;
	username?: string;
	timezone?: string;
	languageCode?: string;
};

export type WidgetStateUpdate = {
	state:
		| 'idle'
		| 'awaiting-consent'
		| 'recording-youtube'
		| 'recording-default'
		| 'default-tracking'
		| 'prompt-user-for-track'
		| 'error';
	provider?: string;
	domain?: string;
	metadata?: Record<string, unknown>;
	error?: string;
	startTime?: number;
	detectedLanguage?: string;
};

export type PlaybackEvent = {
	source: ContentSource;
	event: 'start' | 'pause' | 'end' | 'progress';
	url: string;
	title?: string;
	videoId?: string;
	ts: number;
	position?: number;
	duration?: number;
	rate?: number;
	matchesTarget?: boolean;
};

// Helpers to derive request/response types by key
export type MsgKey = keyof MessageMap;
export type Req<K extends MsgKey> = { type: K } & MessageMap[K]['req'];
export type Res<K extends MsgKey> = MessageMap[K]['res'];

// Narrowed runtime predicate (handy but optional)
export function isReq<K extends MsgKey>(type: K, m: unknown): m is Req<K> {
	return Boolean(
		m && typeof m === 'object' && (m as { type?: string }).type === type
	);
}
