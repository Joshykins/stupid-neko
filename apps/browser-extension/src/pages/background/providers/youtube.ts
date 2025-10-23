import type {
	ContentActivityEvent,
	ContentMetadata,
	ContentHandler,
} from './types';

// YouTube content handler - runs in content script context
import { createLogger } from '../../../lib/logger';
const log = createLogger('content', 'providers:youtube');
let player: HTMLVideoElement | null = null;
let isPlaying = false;
let lastVideoId: string | null = null;
let heartbeatTimer: number | null = null;
let watchInterval: number | null = null;

// Event listeners
let onPlay: (() => void) | null = null;
let onPause: (() => void) | null = null;
let onEnded: (() => void) | null = null;
let onPlaying: (() => void) | null = null;
let onSeeked: (() => void) | null = null;
let onNavigate: (() => void) | null = null;

// Event callback
let onPlaybackEvent: ((event: ContentActivityEvent) => void) | null = null;

const getVideo = (): HTMLVideoElement | null => {
	// Try multiple selectors as YouTube may have changed their DOM structure
	const selectors = [
		'video.html5-main-video',
		'video',
		'#movie_player video',
		'#player video',
		'.html5-video-player video'
	];

	for (const selector of selectors) {
		const video = document.querySelector(selector) as HTMLVideoElement | null;
		if (video) {
			return video;
		}
	}

	return null;
};

const getCurrentVideoId = (): string | undefined => {
	try {
		const url = new URL(location.href);
		const vParam = url.searchParams.get('v');
		if (vParam) return vParam;
		if (url.hostname.endsWith('youtu.be')) {
			const seg = url.pathname.split('/').filter(Boolean)[0];
			if (seg) return seg;
		}
		if (url.pathname.startsWith('/shorts/')) {
			const seg = url.pathname.split('/').filter(Boolean)[1];
			if (seg) return seg;
		}
	} catch {
		// Ignore URL parsing errors
	}
	return undefined;
};

const getCurrentMetadata = (): ContentMetadata => {
	const title = document.title.replace(/ - YouTube$/, '');
	const videoId = getCurrentVideoId();

	// Extract author/channel name from YouTube DOM
	let author: string | undefined;
	try {
		// Try multiple selectors for channel name
		const channelSelectors = [
			'#owner-name a', // Main channel link
			'#owner-name', // Channel name without link
			'#channel-name a', // Alternative channel link
			'#channel-name', // Alternative channel name
			'.ytd-channel-name a', // Channel name in video player
			'.ytd-channel-name', // Channel name without link
			'#upload-info #owner-name a', // Upload info section
			'#upload-info #owner-name', // Upload info without link
		];

		for (const selector of channelSelectors) {
			const element = document.querySelector(selector);
			if (element) {
				author = element.textContent?.trim();
				if (author) {
					break;
				}
			}
		}
	} catch {
		/* noop */
	}

	return { title, videoId, author };
};

const emit = (event: 'start' | 'pause' | 'end' | 'progress'): void => {
	if (!onPlaybackEvent) return;

	const meta = getCurrentMetadata();
	const payload: ContentActivityEvent = {
		source: 'youtube',
		event,
		url: location.href,
		ts: Date.now(),
		metadata: meta,
	};

	// Add position/duration for progress events
	if (event === 'progress' && player) {
		payload.position = Math.floor(player.currentTime);
		payload.duration = Math.floor(player.duration || 0);
		payload.rate = player.playbackRate;
	}

	/* noop */

	onPlaybackEvent(payload);
};

const attach = (p: HTMLVideoElement): void => {
	const ensureStart = () => {
		if (!isPlaying && !p.paused) {
			log.debug('emitting start event');
			isPlaying = true;
			emit('start');
			try {
				const videoId = getCurrentVideoId();
				const key = videoId ? `snbex_youtube_baseline_${videoId}` : 'snbex_youtube_baseline';
				const startCT = Math.floor(p.currentTime || 0);
				const payload = { startCT, startTS: Date.now() } as const;
				localStorage.setItem(key, JSON.stringify(payload));
			} catch {
				/* noop */
			}
		} else {
			/* noop */
		}
	};

	onPlay = () => ensureStart();
	onPlaying = () => ensureStart();
	onSeeked = () => ensureStart();
	onPause = () => {
		if (isPlaying) {
			isPlaying = false;
			emit('pause');
		}
	};
	onEnded = () => {
		if (isPlaying) {
			isPlaying = false;
		}
		emit('end');
	};

	p.addEventListener('play', onPlay, { passive: true });
	p.addEventListener('playing', onPlaying, { passive: true });
	p.addEventListener('seeked', onSeeked, { passive: true });
	p.addEventListener('pause', onPause, { passive: true });
	p.addEventListener('ended', onEnded, { passive: true });

	// Check if video is already playing when we attach
	log.debug('Video attached', { paused: p.paused, isPlaying });
	if (!p.paused && !isPlaying) {
		log.debug('Video already playing, emitting start event');
		isPlaying = true;
		emit('start');
	}

	// Set up heartbeat for progress tracking
	const heartbeat = () => {
		if (!player || player.paused) return;
		emit('progress');
	};

	if (heartbeatTimer != null) {
		window.clearInterval(heartbeatTimer);
	}
	heartbeatTimer = window.setInterval(heartbeat, 5000);
};

const detach = (): void => {
	if (player) {
		if (onPlay) {
			player.removeEventListener('play', onPlay);
		}
		if (onPlaying) {
			player.removeEventListener('playing', onPlaying);
		}
		if (onSeeked) {
			player.removeEventListener('seeked', onSeeked);
		}
		if (onPause) {
			player.removeEventListener('pause', onPause);
		}
		if (onEnded) {
			player.removeEventListener('ended', onEnded);
		}
	}
	player = null;

	if (heartbeatTimer != null) {
		window.clearInterval(heartbeatTimer);
		heartbeatTimer = null;
	}
};

const watchForVideo = (): void => {
	const currentId = getCurrentVideoId() ?? null;
	if (currentId !== lastVideoId) {
		log.debug('nav/videoId change', { from: lastVideoId, to: currentId });

		if (isPlaying) {
			emit('end');
		}
		isPlaying = false;
		lastVideoId = currentId;
	}

	const p = getVideo();
	// (debug) watchForVideo found video, current player status left disabled to avoid noisy logs
	if (p && p !== player) {
		log.debug('attaching to new video element');
		detach();
		player = p;
		attach(p);
	}
};


// Public API for content script
export const youtubeContentHandler: ContentHandler = {
	start: (playbackEventCallback: (event: ContentActivityEvent) => void) => {
		log.debug('starting YouTube content handler');
		onPlaybackEvent = playbackEventCallback;
		isPlaying = false;
		lastVideoId = getCurrentVideoId() ?? null;
		log.debug('initial video ID:', lastVideoId);
		watchForVideo();
		watchInterval = window.setInterval(() => watchForVideo(), 1500);
		onNavigate = () => watchForVideo();
		document.addEventListener('yt-navigate-finish', onNavigate, true);
		log.debug('YouTube content handler started');
	},

	stop: () => {
		if (watchInterval != null) {
			window.clearInterval(watchInterval);
			watchInterval = null;
		}
		if (onNavigate) {
			document.removeEventListener('yt-navigate-finish', onNavigate, true);
			onNavigate = null;
		}
		detach();
		onPlaybackEvent = null;
	},

	getMetadata: (): ContentMetadata => {
		return getCurrentMetadata();
	},

	isActive: (): boolean => {
		return onPlaybackEvent !== null;
	},
};
