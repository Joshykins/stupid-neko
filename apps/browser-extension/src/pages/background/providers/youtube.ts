import type {
	ContentActivityEvent,
	ContentMetadata,
	ContentHandler,
} from "./types";

// YouTube content handler - runs in content script context
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
	return document.querySelector(
		"video.html5-main-video",
	) as HTMLVideoElement | null;
};

const getCurrentVideoId = (): string | undefined => {
	try {
		const url = new URL(location.href);
		const vParam = url.searchParams.get("v");
		if (vParam) return vParam;
		if (url.hostname.endsWith("youtu.be")) {
			const seg = url.pathname.split("/").filter(Boolean)[0];
			if (seg) return seg;
		}
		if (url.pathname.startsWith("/shorts/")) {
			const seg = url.pathname.split("/").filter(Boolean)[1];
			if (seg) return seg;
		}
	} catch {
		// Ignore URL parsing errors
	}
	return undefined;
};

const getCurrentMetadata = (): ContentMetadata => {
	const title = document.title.replace(/ - YouTube$/, "");
	const videoId = getCurrentVideoId();
	return { title, videoId };
};

const emit = (event: "start" | "pause" | "end" | "progress"): void => {
	if (!onPlaybackEvent) return;

	const meta = getCurrentMetadata();
	const payload: ContentActivityEvent = {
		source: "youtube",
		event,
		url: location.href,
		ts: Date.now(),
		metadata: meta,
	};

	// Add position/duration for progress events
	if (event === "progress" && player) {
		payload.position = Math.floor(player.currentTime);
		payload.duration = Math.floor(player.duration || 0);
		payload.rate = player.playbackRate;
	}

	try {
		console.debug("[content][youtube] emit", payload);
	} catch {
		// Ignore console errors
	}

	onPlaybackEvent(payload);
};

const attach = (p: HTMLVideoElement): void => {
	const ensureStart = () => {
		if (!isPlaying && !p.paused) {
			isPlaying = true;
			emit("start");
		}
	};

	onPlay = () => ensureStart();
	onPlaying = () => ensureStart();
	onSeeked = () => ensureStart();
	onPause = () => {
		if (isPlaying) {
			isPlaying = false;
			emit("pause");
		}
	};
	onEnded = () => {
		if (isPlaying) {
			isPlaying = false;
		}
		emit("end");
	};

	p.addEventListener("play", onPlay, { passive: true });
	p.addEventListener("playing", onPlaying, { passive: true });
	p.addEventListener("seeked", onSeeked, { passive: true });
	p.addEventListener("pause", onPause, { passive: true });
	p.addEventListener("ended", onEnded, { passive: true });

	// Set up heartbeat for progress tracking
	const heartbeat = () => {
		if (!player || player.paused) return;
		emit("progress");
	};

	if (heartbeatTimer != null) {
		window.clearInterval(heartbeatTimer);
	}
	heartbeatTimer = window.setInterval(heartbeat, 5000);
};

const detach = (): void => {
	if (player) {
		if (onPlay) {
			player.removeEventListener("play", onPlay);
		}
		if (onPlaying) {
			player.removeEventListener("playing", onPlaying);
		}
		if (onSeeked) {
			player.removeEventListener("seeked", onSeeked);
		}
		if (onPause) {
			player.removeEventListener("pause", onPause);
		}
		if (onEnded) {
			player.removeEventListener("ended", onEnded);
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
		try {
			console.debug("[content][youtube] nav/videoId change", {
				from: lastVideoId,
				to: currentId,
			});
		} catch {
			// Ignore console errors
		}

		if (isPlaying) {
			emit("end");
		}
		isPlaying = false;
		lastVideoId = currentId;
	}

	const p = getVideo();
	if (p && p !== player) {
		detach();
		player = p;
		attach(p);
	}
};

// Public API for content script
export const youtubeContentHandler: ContentHandler = {
	start: (playbackEventCallback: (event: ContentActivityEvent) => void) => {
		onPlaybackEvent = playbackEventCallback;
		isPlaying = false;
		lastVideoId = getCurrentVideoId() ?? null;
		watchForVideo();
		watchInterval = window.setInterval(() => watchForVideo(), 1500);
		onNavigate = () => watchForVideo();
		document.addEventListener("yt-navigate-finish", onNavigate, true);
	},

	stop: () => {
		if (watchInterval != null) {
			window.clearInterval(watchInterval);
			watchInterval = null;
		}
		if (onNavigate) {
			document.removeEventListener("yt-navigate-finish", onNavigate, true);
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
