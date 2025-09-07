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

async function postPlaybackEvent(evt: PlaybackEvent): Promise<void> {
  const convexUrl = getEnv('CONVEX_SITE_URL');
  if (!convexUrl) {
    console.warn('[bg] missing CONVEX_SITE_URL');
    return;
  }
  const token = await getAuthToken();
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    console.debug('[bg] posting playback event', evt);
    const res = await fetch(`${convexUrl}/extension/playback`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(evt),
    });
    await res.text().catch(() => '');
    console.log('[bg] posted playback event', res.status);
  } catch (e) {
    console.warn('[bg] failed posting playback event', e);
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
    postPlaybackEvent(payload);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const state = tabStates[tabId];
  if (state && state.isPlaying && state.lastEvent) {
    const endEvt: PlaybackEvent = { ...state.lastEvent, event: 'end', ts: Date.now() };
    try {
      console.debug('[bg] tab removed, sending end', { tabId, endEvt });
    } catch {}
    postPlaybackEvent(endEvt);
  }
  delete tabStates[tabId];
});

