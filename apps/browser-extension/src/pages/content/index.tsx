import { createRoot } from 'react-dom/client';
import './globals.css';
import { toast } from 'sonner';
import { Toaster } from '../../components/ui/sonner';


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
        chrome.storage.sync.get(['userTargetLanguage'], (items) => resolve(items || {}));
      } catch {
        resolve({});
      }
    });
    const fromChrome = typeof data?.userTargetLanguage === 'string' ? data.userTargetLanguage : null;
    if (fromChrome) return fromChrome;
  } catch { }
  // Fallback to localStorage
  try {
    const fromLocal = localStorage.getItem('userTargetLanguage');
    if (fromLocal) return fromLocal;
  } catch { }
  // As per project rule, assume it exists and throw if not set (except onboarding)
  throw new Error('userTargetLanguage is required but not set'); // [[memory:7976053]]
}

function titleMatchesTargetLanguage(title: string, targetLang: string): boolean {
  const t = (title || '').trim();
  if (!t) return false;
  const lang = targetLang.toLowerCase();
  if (lang === 'ja' || lang === 'jp' || lang.startsWith('ja-')) {
    // Hiragana, Katakana, CJK Unified Ideographs, Halfwidth Katakana
    return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9faf\uff66-\uff9f]/.test(t);
  }
  // Default: no-op match strategy for unknown langs (extend as needed)
  return false;
}

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
  let lastCongratulatedVideoId: string | null = null;

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
    try { console.debug('[content] currentMetadata', { url, title, videoId }); } catch { }
    return { url, title, videoId };
  }

  function emit(event: 'start' | 'pause' | 'end') {
    const meta = currentMetadata();
    const matchesTarget = cachedTargetLanguage ? titleMatchesTargetLanguage(meta.title, cachedTargetLanguage) : undefined;
    const payload = { source: 'youtube', event, ...meta, ts: Date.now(), matchesTarget };
    try { console.debug('[content][youtube] emit', payload); } catch { }
    sendPlaybackEvent(payload);
  }

  function attach(p: HTMLVideoElement) {
    const ensureStart = () => {
      if (!isPlaying && !p.paused) {
        isPlaying = true;
        emit('start');
        // Congratulate when content appears to match target language
        try {
          const videoId = getCurrentVideoId();
          if (videoId && videoId !== lastCongratulatedVideoId && cachedTargetLanguage) {
            const looksMatch = titleMatchesTargetLanguage(document.title.replace(/ - YouTube$/, ''), cachedTargetLanguage);
            if (looksMatch) {
              toast.success(`Great job! You're listening in ${cachedTargetLanguage.toUpperCase()}.`);
              lastCongratulatedVideoId = videoId;
            }
          }
        } catch { }
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
        matchesTarget: cachedTargetLanguage ? titleMatchesTargetLanguage(meta.title, cachedTargetLanguage) : undefined,
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
div.id = '__stupid-neko-root';
// HTML
const html = document.querySelector('html');
html?.appendChild(div);
const rootContainer = document.querySelector('#__stupid-neko-root');
if (!rootContainer) throw new Error("Can't find Content root element");
const root = createRoot(rootContainer);
root.render(
  <div className='h-screen w-screen fixed z-500 pointer-events-none'>
    <Toaster />
    <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-black !bg-indigo-400 z-50 px-1 text-white text-lg p-4 rounded-md'>stupid-neko content 123</div>
  </div>
);

// Prime target language cache before booting integrations
loadTargetLanguage()
  .then((lang) => { cachedTargetLanguage = lang; })
  .catch((err) => { try { console.warn('[content] target language not set', err); } catch { } })
  .finally(() => {
    boot();
  });

// Receive toast messages from background and show via Sonner
try {
  chrome.runtime.onMessage.addListener((message) => {
    try { console.debug('[content] onMessage', message); } catch { }
    if (message && message.type === 'DEBUG_PING') {
      try { console.debug('[content] DEBUG_PING received', message.payload); } catch { }
      return;
    }
    if (message && message.type === 'TOAST') {
      const payload = message.payload || {};
      const msg: string | undefined = payload.message;
      const level: string | undefined = payload.level;
      if (typeof msg === 'string' && msg.length > 0) {
        if (level === 'success') toast.success(msg);
        else if (level === 'error') toast.error(msg);
        else if (level === 'info') (toast as any).message ? (toast as any).message(msg) : toast(msg);
        else toast(msg);
      }
    } else if (message && message.type === 'CONTENT_ACTIVITY_RECORDED') {
      const p = message.payload || {};
      try { console.debug('[content] CONTENT_ACTIVITY_RECORDED', p); } catch { }
      if (p.error) {
        toast.error('We could not record your activity this time.');
        return;
      }
      const langFromBackend: string | undefined = p?.currentTargetLanguage?.languageCode;
      const lang = (langFromBackend || cachedTargetLanguage || 'your target language').toUpperCase();
      try { console.debug('[content] using language for toast', { langFromBackend, cachedTargetLanguage }); } catch { }
      if (p?.contentLabel) {
        try { console.debug('[content] contentLabel cached', p.contentLabel); } catch { }
        try { localStorage.setItem('lastContentLabel', JSON.stringify(p.contentLabel)); } catch { }
      }
      if (langFromBackend) {
        try { localStorage.setItem('currentTargetLanguage', langFromBackend); } catch { }
      }
      const title = (p.title || document.title.replace(/ - YouTube$/, '') || '').trim();
      const compliments: Array<string> = [
        'Nice pick!',
        'Excellent choice!', 'Love that one!', 'Great selection!', 'Perfect for practice!',
      ];
      const compliment = compliments[Math.floor(Math.random() * compliments.length)];
      const nekoCount = Math.floor(Math.random() * 900) + 100; // 100-999 mock
      const RecordDot = () => (
        <span className='inline-flex items-center justify-center mr-2'>
          <span className='relative inline-block'>
            <span className='absolute inset-0 rounded-full bg-red-500/40 blur-[3px] animate-ping' />
            <span className='relative inline-block size-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' />
          </span>
        </span>
      );
      toast(
        <div className='flex flex-col gap-2'>
          <div className='flex items-center gap-3'>
            <RecordDot />
            <span className='font-semibold'>Tracking {lang} activity</span>
            <button onClick={() => (toast as any).dismiss?.()}
              className='ml-auto text-xs border-2 border-black text-black bg-white px-2 py-0.5 rounded'>Close</button>
          </div>
          {title && <div className='text-sm opacity-90'>"{title}"</div>}
          <div className='text-base'>We see you’re engaging with {lang} content. {compliment}</div>
          <div className='text-sm opacity-80'>{nekoCount} nekos have also used this to learn {lang}.</div>
        </div>,
        { duration: 30000, dismissible: true }
      );
    }
  });
} catch { }

// Demo toast to verify content script is active
try {
  toast.success('stupid-neko is active on this page');
} catch { }
