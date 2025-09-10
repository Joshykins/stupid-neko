console.log('background script loaded');

const CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL;
const WEB_APP_URL = import.meta.env.VITE_WEB_APP_URL;

try {
  // Helpful to confirm env injection at build time
  // These identifiers are replaced at build via Vite `define`
  // They may be empty strings if not provided
  console.debug('[bg] env check', {
    convex: (typeof CONVEX_SITE_URL !== 'undefined') ? CONVEX_SITE_URL : undefined,
    web: (typeof WEB_APP_URL !== 'undefined') ? WEB_APP_URL : undefined,
  });
} catch {}

type PlaybackEvent = {
  source: 'youtube';
  event: 'start' | 'pause' | 'end' | 'progress';
  url: string;
  title?: string;
  videoId?: string;
  ts: number;
  position?: number;
  duration?: number;
  rate?: number;
};

type TabPlaybackState = {
  lastEvent: PlaybackEvent | null;
  isPlaying: boolean;
};

const tabStates: Record<number, TabPlaybackState> = {};

type TokenCache = {
  token: string | null;
  expiresAt: number | null; // ms epoch
};

const tokenCache: TokenCache = { token: null, expiresAt: null };

function getEnv(name: 'CONVEX_SITE_URL' | 'WEB_APP_URL'): string | undefined {
  const g: any = globalThis as any;
  const meta: any = (import.meta as any);
  // Prefer compile-time injected constants if available
  try {
    if (name === 'CONVEX_SITE_URL' && typeof CONVEX_SITE_URL !== 'undefined' && CONVEX_SITE_URL) return CONVEX_SITE_URL;
  } catch {}
  try {
    if (name === 'WEB_APP_URL' && typeof WEB_APP_URL !== 'undefined' && WEB_APP_URL) return WEB_APP_URL;
  } catch {}
  // Fallbacks: Vite env and global shims
  return g[`VITE_${name}`] || meta?.env?.[`VITE_${name}`] || g[name] || meta?.env?.[name];
}

async function getAuthToken(): Promise<string | null> {
  const now = Date.now();
  if (tokenCache.token && tokenCache.expiresAt && tokenCache.expiresAt - now > 60_000) {
    return tokenCache.token;
  }
  const webAppUrl = getEnv('WEB_APP_URL');
  if (!webAppUrl) return null;
  try {
    const res = await fetch(`${webAppUrl}/api/convex/token`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
    });
    if (!res.ok) return null;
    const { token } = await res.json();
    if (!token) return null;
    tokenCache.token = token;
    tokenCache.expiresAt = now + 10 * 60_000; // cache ~10m
    return token;
  } catch (e) {
    return null;
  }
}

function deriveYouTubeId(input: string | undefined): string | undefined {
  if (!input) return undefined;
  try {
    if (/^[A-Za-z0-9_-]{6,}$/i.test(input) && !input.includes('http')) return input;
    const url = new URL(input);
    if (url.hostname.includes('youtube.com')) {
      const vParam = url.searchParams.get('v');
      if (vParam) return vParam;
      if (url.pathname.startsWith('/shorts/')) {
        const seg = url.pathname.split('/').filter(Boolean)[1];
        if (seg) return seg;
      }
    }
    if (input.includes('youtu.be')) {
      const url2 = new URL(input);
      const seg = url2.pathname.replace(/^\//, '');
      if (seg) return seg;
    }
  } catch {}
  return undefined;
}

async function postContentActivityFromPlayback(evt: PlaybackEvent): Promise<void> {
  const convexUrl = getEnv('CONVEX_SITE_URL');
  if (!convexUrl) {
    console.warn('[bg] missing CONVEX_SITE_URL');
    return;
  }
  const token = await getAuthToken();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const activityType = (evt.event === 'progress') ? 'heartbeat' : evt.event;
    let contentKey: string | undefined;
    if (evt.source === 'youtube') {
      const id = evt.videoId || deriveYouTubeId(evt.url);
      if (id) contentKey = `youtube:${id}`;
    }
    if (!contentKey) {
      console.warn('[bg] missing contentKey, skipping post', evt);
      return;
    }
    const body = {
      source: evt.source,
      activityType,
      contentKey,
      url: evt.url,
      occurredAt: evt.ts,
    };
    console.debug('[bg] posting content activity', body);
    const res = await fetch(`${convexUrl}/extension/record-content-activity`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(body),
    });
    await res.text().catch(() => '');
    console.log('[bg] posted content activity', res.status);
  } catch (e) {
    console.warn('[bg] failed posting content activity', e);
  }
}

chrome.runtime.onMessage.addListener((message, sender, _sendResponse) => {
  console.log('onMessage', message);
  if (message && message.type === 'PLAYBACK_EVENT') {
    const payload = message.payload as PlaybackEvent;
    try {
      console.debug('[bg] received PLAYBACK_EVENT', payload);
    } catch {}
    const tabId = sender.tab?.id;
    if (typeof tabId === 'number') {
      const prev = tabStates[tabId] || { lastEvent: null, isPlaying: false } as TabPlaybackState;
      if (payload.event === 'start') {
        tabStates[tabId] = { lastEvent: payload, isPlaying: true };
      } else if (payload.event === 'pause') {
        tabStates[tabId] = { lastEvent: payload, isPlaying: false };
      } else if (payload.event === 'end') {
        tabStates[tabId] = { lastEvent: payload, isPlaying: false };
      } else if (payload.event === 'progress') {
        tabStates[tabId] = { lastEvent: payload, isPlaying: true };
      } else {
        tabStates[tabId] = prev;
      }
    }
    postContentActivityFromPlayback(payload);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const state = tabStates[tabId];
  if (state && state.isPlaying && state.lastEvent) {
    const endEvt: PlaybackEvent = { ...state.lastEvent, event: 'end', ts: Date.now() };
    try {
      console.debug('[bg] tab removed, sending end', { tabId, endEvt });
    } catch {}
    postContentActivityFromPlayback(endEvt);
  }
  delete tabStates[tabId];
});

