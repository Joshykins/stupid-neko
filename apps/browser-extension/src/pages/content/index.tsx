import React from "react";
import { createRoot } from "react-dom/client";
import type { MeInfo } from "../../../../../convex/meFunctions";
import type { LanguageCode } from "../../../../../convex/schema";
// Removed sonner in favor of in-page TrackingWidget UI
// import { toast } from 'sonner';
// import { Toaster } from '../../components/ui/sonner';
import TrackingWidget from "../../components/TrackingWidget";
// Ensure CSS asset is emitted by the build and available to fetch
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import contentCssUrl from "./globals.css?url";

type BgAuthMe = MeInfo & { currentStreak?: number };

async function bgGetAuthState(): Promise<{
	isAuthed: boolean;
	me: BgAuthMe | null;
}> {
	return new Promise((resolve) => {
		try {
			chrome.runtime.sendMessage({ type: "GET_AUTH_STATE" }, (resp) => {
				resolve((resp as any) || { isAuthed: false, me: null });
			});
		} catch {
			resolve({ isAuthed: false, me: null });
		}
	});
}

// Load self-hosted fonts via FontFace API (robust in MV3 and shadow/portals)
async function loadFontsUsingFontFace(): Promise<void> {
	try {
		const faces: Array<FontFace> = [];
		const pjNormal = new FontFace(
			"Plus Jakarta Sans",
			`url('${chrome.runtime.getURL("fonts/PlusJakartaSans-VariableFont_wght.ttf")}')`,
			{ style: "normal", weight: "100 900" },
		);
		faces.push(pjNormal);
		try {
			const pjItalic = new FontFace(
				"Plus Jakarta Sans",
				`url('${chrome.runtime.getURL("fonts/PlusJakartaSans-Italic-VariableFont_wght.ttf")}')`,
				{ style: "italic", weight: "100 900" },
			);
			faces.push(pjItalic);
		} catch {}
		try {
			const baloo = new FontFace(
				"Baloo 2",
				`url('${chrome.runtime.getURL("fonts/Baloo2-VariableFont_wght.ttf")}')`,
				{ style: "normal", weight: "400 800" },
			);
			faces.push(baloo);
		} catch {}
		const loads = faces.map((f) => f.load());
		const loaded = await Promise.all(loads);
		loaded.forEach((f) => document.fonts.add(f));
		document.documentElement.classList.add("sn-fonts-ready");
	} catch {}
}

async function bgGetContentLabel(contentKey: string): Promise<any | null> {
	return new Promise((resolve) => {
		try {
			chrome.runtime.sendMessage(
				{ type: "GET_CONTENT_LABEL", contentKey },
				(resp) => {
					resolve((resp as any)?.contentLabel ?? null);
				},
			);
		} catch {
			resolve(null);
		}
	});
}

function computeCurrentContentKey(): string | null {
	try {
		const url = new URL(location.href);
		if (/(^|\.)youtube\.com$/.test(url.hostname)) {
			const vParam = url.searchParams.get("v");
			if (vParam) return `youtube:${vParam}`;
			if (url.pathname.startsWith("/shorts/")) {
				const seg = url.pathname.split("/").filter(Boolean)[1];
				if (seg) return `youtube:${seg}`;
			}
		}
		if (url.hostname.endsWith("youtu.be")) {
			const seg = url.pathname.split("/").filter(Boolean)[0];
			if (seg) return `youtube:${seg}`;
		}
	} catch {}
	return null;
}

function TrackingWidgetGate() {
	const [show, setShow] = React.useState<boolean>(false);
	const [userName, setUserName] = React.useState<string>("");
	const [lang, setLang] = React.useState<LanguageCode>("ja");
	const recompute = React.useCallback(async () => {
		// Respect user toggle
		try {
			const data = await new Promise<Record<string, any>>((resolve) => {
				try {
					chrome.storage.sync.get(["widgetEnabled"], (items) =>
						resolve(items || {}),
					);
				} catch {
					resolve({});
				}
			});
			const enabled =
				typeof data?.widgetEnabled === "boolean" ? data.widgetEnabled : true;
			if (!enabled) {
				setShow(false);
				return;
			}
		} catch {}
		const key = computeCurrentContentKey();
		if (!key) {
			setShow(false);
			return;
		}
		const authState = await bgGetAuthState();
		if (!authState?.isAuthed || !authState?.me) {
			setShow(false);
			return;
		}
		try {
			if (authState.me?.name) setUserName(authState.me.name);
			const resolvedLang =
				(authState.me.languageCode as LanguageCode | undefined) ||
				(cachedTargetLanguage as LanguageCode | undefined);
			if (resolvedLang) setLang(resolvedLang);
		} catch {}
		const label = await bgGetContentLabel(key);
		const labelReady = label && label.stage === "completed";
		const effectiveLang =
			(authState.me.languageCode as LanguageCode | undefined) ||
			(cachedTargetLanguage as LanguageCode | undefined);
		const matchesLang =
			label?.contentLanguageCode &&
			effectiveLang &&
			label.contentLanguageCode === effectiveLang;
		setShow(!!(labelReady && matchesLang));
	}, []);

	React.useEffect(() => {
		recompute();
	}, [recompute]);
	React.useEffect(() => {
		const handler = (_message: any) => {
			recompute();
		};
		try {
			chrome.runtime.onMessage.addListener(handler);
		} catch {}
		return () => {
			try {
				chrome.runtime.onMessage.removeListener(handler);
			} catch {}
		};
	}, [recompute]);

	if (!show) return null;
	return (
		<TrackingWidget
			userName={userName}
			languageCode={lang}
			collapsedByDefault
		/>
	);
}

type Integration = {
	id: string;
	test(): boolean;
	start(): void;
	stop(): void;
};

// Load the user's target language (assumed to be set during onboarding)
let cachedTargetLanguage: string | null = null;
async function loadTargetLanguage(): Promise<string> {
	// Try chrome.storage.sync first
	try {
		const data = await new Promise<Record<string, any>>((resolve) => {
			try {
				chrome.storage.sync.get(["userTargetLanguage"], (items) =>
					resolve(items || {}),
				);
			} catch {
				resolve({});
			}
		});
		const fromChrome =
			typeof data?.userTargetLanguage === "string"
				? data.userTargetLanguage
				: null;
		if (fromChrome) return fromChrome;
	} catch {}
	// Fallback to localStorage
	try {
		const fromLocal = localStorage.getItem("userTargetLanguage");
		if (fromLocal) return fromLocal;
	} catch {}
	// As per project rule, assume it exists and throw if not set (except onboarding)
	throw new Error("userTargetLanguage is required but not set"); // [[memory:7976053]]
}

function titleMatchesTargetLanguage(
	title: string,
	targetLang: string,
): boolean {
	const t = (title || "").trim();
	if (!t) return false;
	const lang = targetLang.toLowerCase();
	if (lang === "ja" || lang === "jp" || lang.startsWith("ja-")) {
		// Hiragana, Katakana, CJK Unified Ideographs, Halfwidth Katakana
		return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9faf\uff66-\uff9f]/.test(t);
	}
	// Default: no-op match strategy for unknown langs (extend as needed)
	return false;
}

function sendPlaybackEvent(payload: any) {
	chrome.runtime.sendMessage({ type: "PLAYBACK_EVENT", payload });
}

function createYouTubeIntegration(): Integration {
	let player: HTMLVideoElement | null = null;
	let isPlaying = false;
	let lastVideoId: string | null = null;
	let onPlay: any;
	let onPause: any;
	let onEnded: any;
	let onPlaying: any;
	let onSeeked: any;
	let onNavigate: (() => void) | null = null;
	let heartbeatTimer: number | null = null;
	let lastCongratulatedVideoId: string | null = null;

	function getVideo(): HTMLVideoElement | null {
		return document.querySelector(
			"video.html5-main-video",
		) as HTMLVideoElement | null;
	}

	function getCurrentVideoId(): string | undefined {
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
		} catch {}
		return undefined;
	}

	function currentMetadata() {
		const url = location.href;
		const title = document.title.replace(/ - YouTube$/, "");
		const videoId = getCurrentVideoId();
		try {
			console.debug("[content] currentMetadata", { url, title, videoId });
		} catch {}
		return { url, title, videoId };
	}

	async function resolveContentLabel() {
		const meta = currentMetadata();
		const id = getCurrentVideoId();
		const contentKey = id ? `youtube:${id}` : undefined;
		if (!contentKey) return;
		const label = await bgGetContentLabel(contentKey);
		if (label) {
			try {
				localStorage.setItem("lastContentLabel", JSON.stringify(label));
			} catch {}
		}
	}

	function emit(event: "start" | "pause" | "end") {
		const meta = currentMetadata();
		const matchesTarget = cachedTargetLanguage
			? titleMatchesTargetLanguage(meta.title, cachedTargetLanguage)
			: undefined;
		const payload = {
			source: "youtube",
			event,
			...meta,
			ts: Date.now(),
			matchesTarget,
		};
		try {
			console.debug("[content][youtube] emit", payload);
		} catch {}
		sendPlaybackEvent(payload);
	}

	function attach(p: HTMLVideoElement) {
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

		// Probe for cached label on attach
		resolveContentLabel();

		const heartbeat = () => {
			if (!player || player.paused) return;
			const meta = currentMetadata();
			const payload = {
				source: "youtube",
				event: "progress" as const,
				...meta,
				ts: Date.now(),
				position: Math.floor(player.currentTime),
				duration: Math.floor(player.duration || 0),
				rate: player.playbackRate,
				matchesTarget: cachedTargetLanguage
					? titleMatchesTargetLanguage(meta.title, cachedTargetLanguage)
					: undefined,
			};
			try {
				console.debug("[content][youtube] heartbeat", payload);
			} catch {}
			sendPlaybackEvent(payload);
		};
		if (heartbeatTimer != null) window.clearInterval(heartbeatTimer);
		heartbeatTimer = window.setInterval(heartbeat, 5000);
	}

	function detach() {
		if (player) {
			if (onPlay) player.removeEventListener("play", onPlay as any);
			if (onPlaying) player.removeEventListener("playing", onPlaying as any);
			if (onSeeked) player.removeEventListener("seeked", onSeeked as any);
			if (onPause) player.removeEventListener("pause", onPause as any);
			if (onEnded) player.removeEventListener("ended", onEnded as any);
		}
		player = null;
		if (heartbeatTimer != null) window.clearInterval(heartbeatTimer);
		heartbeatTimer = null;
	}

	function watchForVideo() {
		const currentId = getCurrentVideoId() ?? null;
		if (currentId !== lastVideoId) {
			try {
				console.debug("[content][youtube] nav/videoId change", {
					from: lastVideoId,
					to: currentId,
				});
			} catch {}
			if (isPlaying) emit("end");
			isPlaying = false;
			lastVideoId = currentId;
			lastCongratulatedVideoId = null;
		}
		const p = getVideo();
		if (p && p !== player) {
			detach();
			player = p;
			attach(p);
		}
	}

	let interval: number | null = null;

	return {
		id: "youtube",
		test() {
			return /(^|\.)youtube\.com$/.test(location.hostname);
		},
		start() {
			isPlaying = false;
			lastVideoId = getCurrentVideoId() ?? null;
			watchForVideo();
			interval = window.setInterval(watchForVideo, 1500);
			onNavigate = () => watchForVideo();
			document.addEventListener("yt-navigate-finish", onNavigate as any, true);
		},
		stop() {
			if (interval != null) window.clearInterval(interval);
			if (onNavigate)
				document.removeEventListener(
					"yt-navigate-finish",
					onNavigate as any,
					true,
				);
			detach();
		},
	};
}

const integrations: Array<Integration> = [createYouTubeIntegration()];

function boot() {
	const matched = integrations.find((i) => i.test());
	if (matched) matched.start();
}

// Create Shadow DOM host and inject CSS inside to isolate styles and fonts
const host = document.createElement("div");
host.id = "__stupid-neko-host";
host.style.all = "initial";
host.style.position = "fixed";
host.style.top = "0";
host.style.left = "0";
host.style.zIndex = "2147483647";
document.body.appendChild(host);
const shadow = host.attachShadow({ mode: "open" });

// Shadow root children: style, app root, and portal root for Radix
const styleEl = document.createElement("style");
const appRoot = document.createElement("div");
appRoot.id = "__stupid-neko-root";
const portalRoot = document.createElement("div");
portalRoot.id = "__stupid-neko-portal";
(window as any).__stupidNekoPortalEl = portalRoot;
// Ensure overlays are interactive even if CSS isn't loaded yet
portalRoot.style.pointerEvents = "auto";
shadow.appendChild(styleEl);
shadow.appendChild(appRoot);
shadow.appendChild(portalRoot);

const root = createRoot(appRoot);

// Attempt to install extension-bundled fonts and scoped CSS before rendering
(async () => {
	await loadFontsUsingFontFace().catch(() => {});
	try {
		let cssText = "";
		// Try emitted asset URL first (stable even if file name changes)
		if (typeof contentCssUrl === "string") {
			try {
				cssText = await fetch(contentCssUrl).then((r) => r.text());
			} catch {
				cssText = "";
			}
		}
		// Fallback to fixed name used by crx plugin
		if (!cssText) {
			try {
				const cssUrl = chrome.runtime.getURL("contentStyle.css");
				const cssResp = await fetch(cssUrl);
				cssText = cssResp.ok ? await cssResp.text() : "";
			} catch {
				cssText = "";
			}
		}
		styleEl.textContent = cssText || "";
	} catch {
		styleEl.textContent = "";
	}
	root.render(
		<div
			className="h-screen w-screen fixed z-[5000] pointer-events-none"
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				width: "100vw",
				height: "100vh",
				pointerEvents: "none" as any,
			}}
		>
			<TrackingWidgetGate />
		</div>,
	);
})();

// Prime target language cache before booting integrations
loadTargetLanguage()
	.then((lang) => {
		cachedTargetLanguage = lang;
	})
	.catch((err) => {
		try {
			console.warn("[content] target language not set", err);
		} catch {}
	})
	.finally(() => {
		boot();
	});

// Receive toast messages from background and show via Sonner
try {
	chrome.runtime.onMessage.addListener((message) => {
		try {
			console.debug("[content] onMessage", message);
		} catch {}
		if (message && message.type === "DEBUG_PING") {
			try {
				console.debug("[content] DEBUG_PING received", message.payload);
			} catch {}
			return;
		}
		if (message && message.type === "CONTENT_ACTIVITY_RECORDED") {
			const p = message.payload || {};
			try {
				console.debug("[content] CONTENT_ACTIVITY_RECORDED", p);
			} catch {}
			if (p?.contentLabel) {
				try {
					localStorage.setItem(
						"lastContentLabel",
						JSON.stringify(p.contentLabel),
					);
				} catch {}
			}
			const langFromBackend: string | undefined =
				p?.currentTargetLanguage?.languageCode;
			if (langFromBackend) {
				try {
					localStorage.setItem("currentTargetLanguage", langFromBackend);
				} catch {}
			}
		}
	});
} catch {}
