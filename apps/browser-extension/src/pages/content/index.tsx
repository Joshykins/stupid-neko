import { createRoot } from 'react-dom/client';
import './style.css';


type Integration = {
  id: string;
  test(): boolean;
  start(): void;
  stop(): void;
};

function sendPlaybackEvent(payload: any) {
  chrome.runtime.sendMessage({ type: 'PLAYBACK_EVENT', payload });
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

  function getVideo(): HTMLVideoElement | null {
    return document.querySelector('video.html5-main-video') as HTMLVideoElement | null;
  }

  function getCurrentVideoId(): string | undefined {
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
    } catch { }
    return undefined;
  }

  function currentMetadata() {
    const url = location.href;
    const title = document.title.replace(/ - YouTube$/, '');
    const videoId = getCurrentVideoId();
    return { url, title, videoId };
  }

  function emit(event: 'start' | 'pause' | 'end') {
    const meta = currentMetadata();
    const payload = { source: 'youtube', event, ...meta, ts: Date.now() };
    try {
      console.debug('[content][youtube] emit', payload);
    } catch { }
    sendPlaybackEvent(payload);
  }

  function attach(p: HTMLVideoElement) {
    const ensureStart = () => {
      if (!isPlaying && !p.paused) {
        isPlaying = true;
        emit('start');
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

    const heartbeat = () => {
      if (!player || player.paused) return;
      const meta = currentMetadata();
      const payload = {
        source: 'youtube',
        event: 'progress' as const,
        ...meta,
        ts: Date.now(),
        position: Math.floor(player.currentTime),
        duration: Math.floor(player.duration || 0),
        rate: player.playbackRate,
      };
      try { console.debug('[content][youtube] heartbeat', payload); } catch { }
      sendPlaybackEvent(payload);
    };
    if (heartbeatTimer != null) window.clearInterval(heartbeatTimer);
    heartbeatTimer = window.setInterval(heartbeat, 5000);
  }

  function detach() {
    if (player) {
      if (onPlay) player.removeEventListener('play', onPlay as any);
      if (onPlaying) player.removeEventListener('playing', onPlaying as any);
      if (onSeeked) player.removeEventListener('seeked', onSeeked as any);
      if (onPause) player.removeEventListener('pause', onPause as any);
      if (onEnded) player.removeEventListener('ended', onEnded as any);
    }
    player = null;
    if (heartbeatTimer != null) window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  function watchForVideo() {
    const currentId = getCurrentVideoId() ?? null;
    if (currentId !== lastVideoId) {
      try { console.debug('[content][youtube] nav/videoId change', { from: lastVideoId, to: currentId }); } catch { }
      if (isPlaying) emit('end');
      isPlaying = false;
      lastVideoId = currentId;
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
    id: 'youtube',
    test() {
      return /(^|\.)youtube\.com$/.test(location.hostname);
    },
    start() {
      isPlaying = false;
      lastVideoId = getCurrentVideoId() ?? null;
      watchForVideo();
      interval = window.setInterval(watchForVideo, 1500);
      onNavigate = () => watchForVideo();
      document.addEventListener('yt-navigate-finish', onNavigate as any, true);
    },
    stop() {
      if (interval != null) window.clearInterval(interval);
      if (onNavigate) document.removeEventListener('yt-navigate-finish', onNavigate as any, true);
      detach();
    },
  };
}

const integrations: Array<Integration> = [createYouTubeIntegration()];

function boot() {
  const matched = integrations.find((i) => i.test());
  if (matched) matched.start();
}

// Optional visual debug badge (keep previous content root minimal)
const div = document.createElement('div');
div.id = '__root';
document.body.appendChild(div);
const rootContainer = document.querySelector('#__root');
if (!rootContainer) throw new Error("Can't find Content root element");
const root = createRoot(rootContainer);
root.render(
  <div className='absolute bottom-0 left-0 text-xs text-black bg-amber-400 z-50 px-1'>stupid-neko content</div>
);

boot();
