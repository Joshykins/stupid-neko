// Background scripts cannot render UI; send messages to content for toasts

console.log('background script loaded');

const BUILD_CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL;
const BUILD_WEB_APP_URL = import.meta.env.VITE_WEB_APP_URL;

try {
  // Helpful to confirm env injection at build time
  // These identifiers are replaced at build via Vite `define`
  // They may be empty strings if not provided
  console.debug('[bg] env check', {
    convex: (typeof BUILD_CONVEX_SITE_URL !== 'undefined') ? BUILD_CONVEX_SITE_URL : undefined,
    web: (typeof BUILD_WEB_APP_URL !== 'undefined') ? BUILD_WEB_APP_URL : undefined,
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
  matchesTarget?: boolean;
};

type TabPlaybackState = {
  lastEvent: PlaybackEvent | null;
  isPlaying: boolean;
  allowPost?: boolean;
  lastContentKey?: string;
};

const tabStates: Record<number, TabPlaybackState> = {};

// Cache recent labels by content key for quick lookup from content/popup
const contentLabelsByKey: Record<string, any> = {};

// Lightweight auth cache
type AuthMe = {
  name?: string;
  email?: string;
  image?: string;
  username?: string;
  timezone?: string;
  languageCode?: string;
  [key: string]: unknown;
};
type AuthState = { isAuthed: boolean; me: AuthMe | null };
let lastAuthState: { value: AuthState | null; fetchedAt: number | null } = {
  value: null,
  fetchedAt: null,
};

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
    if (name === 'CONVEX_SITE_URL' && typeof BUILD_CONVEX_SITE_URL !== 'undefined' && BUILD_CONVEX_SITE_URL) return BUILD_CONVEX_SITE_URL;
  } catch {}
  try {
    if (name === 'WEB_APP_URL' && typeof BUILD_WEB_APP_URL !== 'undefined' && BUILD_WEB_APP_URL) return BUILD_WEB_APP_URL;
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

async function fetchMe(): Promise<AuthState> {
  const token = await getAuthToken();
  if (!token) return { isAuthed: false, me: null };
  const convexUrl = getEnv('CONVEX_SITE_URL');
  const webAppUrl = getEnv('WEB_APP_URL');
  const headers: Record<string, string> = { 'content-type': 'application/json', 'Authorization': `Bearer ${token}` };
  // Try Convex extension endpoint first, then fall back to web app if present
  try {
    if (convexUrl) {
      const res = await fetch(`${convexUrl}/extension/me`, { method: 'GET', headers, credentials: 'include' });
      if (res.ok) {
        const data = (await res.json().catch(() => null)) as { isAuthed?: boolean; me?: AuthMe | null; progress?: { currentStreak?: number; longestStreak?: number } | null } | null;
        let me: AuthMe | null = data?.me ?? null;
        const progress = data?.progress;
        if (me && progress) {
          me = { ...me, currentStreak: progress.currentStreak, longestStreak: progress.longestStreak } as AuthMe;
        }
        return { isAuthed: data?.isAuthed ?? true, me };
      }
    }
  } catch {}
  try {
    if (webAppUrl) {
      const res2 = await fetch(`${webAppUrl}/api/me`, { method: 'GET', headers, credentials: 'include' });
      if (res2.ok) {
        const me2 = (await res2.json().catch(() => null)) as AuthMe | null;
        return { isAuthed: true, me: me2 };
      }
    }
  } catch {}
  return { isAuthed: true, me: null };
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

type ContentActivityResult = {
  ok: boolean;
  saved: boolean;
  contentActivityId?: string;
  contentLabelId?: string;
  isWaitingOnLabeling?: boolean;
  reason?: string;
  contentKey?: string;
  contentLabel?: any;
  currentTargetLanguage?: { languageCode?: string } | null;
};

async function postContentActivityFromPlayback(evt: PlaybackEvent, tabId?: number): Promise<ContentActivityResult | null> {
  const convexUrl = getEnv('CONVEX_SITE_URL');
  if (!convexUrl) {
    console.warn('[bg] missing CONVEX_SITE_URL');
    return null;
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
      return { ok: false, saved: false } as ContentActivityResult;
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
    const json: ContentActivityResult = await res.json().catch(() => ({ ok: false, saved: false } as ContentActivityResult));
    console.log('[bg] posted content activity', res.status, json);
    // Cache label by content key when provided
    try {
      const key = json?.contentKey || contentKey;
      if (key && json?.contentLabel) {
        contentLabelsByKey[key] = json.contentLabel;
      }
    } catch {}
    // Notify the originating tab for a user-friendly toast only when saved
    try {
      if (typeof tabId === 'number' && json?.saved) {
        chrome.tabs.sendMessage(tabId, {
          type: 'CONTENT_ACTIVITY_RECORDED',
          payload: {
            source: evt.source,
            url: evt.url,
            title: evt.title,
            videoId: evt.videoId,
            contentKey: json.contentKey || contentKey,
            occurredAt: evt.ts,
            saved: true,
            contentLabel: json.contentLabel,
            currentTargetLanguage: json.currentTargetLanguage,
          },
        });
      }
    } catch {}
    return json;
  } catch (e) {
    console.warn('[bg] failed posting content activity', e);
    try {
      if (typeof tabId === 'number') {
        chrome.tabs.sendMessage(tabId, { type: 'CONTENT_ACTIVITY_RECORDED', payload: { error: true } });
      }
    } catch {}
    return null;
  }
}

chrome.runtime.onMessage.addListener((message, sender, _sendResponse) => {
  console.log('onMessage', message);
  // Quick RPCs from content/popup
  if (message && message.type === 'GET_AUTH_STATE') {
    const now = Date.now();
    const fresh = lastAuthState.value && lastAuthState.fetchedAt && (now - lastAuthState.fetchedAt < 60_000);
    if (fresh) {
      try { _sendResponse?.(lastAuthState.value); } catch {}
      return true;
    }
    fetchMe()
      .then((auth) => {
        lastAuthState = { value: auth, fetchedAt: Date.now() };
        try { _sendResponse?.(auth); } catch {}
      })
      .catch(() => {
        try { _sendResponse?.({ isAuthed: false, me: null } as AuthState); } catch {}
      });
    return true; // async response
  }
  if (message && message.type === 'GET_CONTENT_LABEL') {
    try {
      const key = message?.contentKey as string | undefined;
      const label = key ? contentLabelsByKey[key] : undefined;
      _sendResponse?.({ contentLabel: label || null });
    } catch {
      try { _sendResponse?.({ contentLabel: null }); } catch {}
    }
    return true;
  }
  if (message && message.type === 'PLAYBACK_EVENT') {
    const payload = message.payload as PlaybackEvent;
    try { console.debug('[bg] PLAYBACK_EVENT raw', payload); } catch {}
    try {
      console.debug('[bg] received PLAYBACK_EVENT', payload);
    } catch {}
    const tabId = sender.tab?.id;
    if (typeof tabId === 'number') {
      try {
        chrome.tabs.sendMessage(tabId, { type: 'DEBUG_PING', payload: { seenAt: Date.now(), event: payload.event } });
      } catch {}
      const prev = tabStates[tabId] || { lastEvent: null, isPlaying: false } as TabPlaybackState;
      // compute contentKey for comparison
      let nextKey: string | undefined;
      if (payload.source === 'youtube') {
        const id = payload.videoId || deriveYouTubeId(payload.url);
        if (id) nextKey = `youtube:${id}`;
      }
      const contentChanged = nextKey && nextKey !== prev.lastContentKey;
      if (payload.event === 'start') {
        tabStates[tabId] = {
          lastEvent: payload,
          isPlaying: true,
          allowPost: !!payload.matchesTarget,
          lastContentKey: nextKey || prev.lastContentKey,
        };
      } else if (payload.event === 'pause') {
        tabStates[tabId] = { ...prev, lastEvent: payload, isPlaying: false };
      } else if (payload.event === 'end') {
        tabStates[tabId] = { ...prev, lastEvent: payload, isPlaying: false };
      } else if (payload.event === 'progress') {
        tabStates[tabId] = { ...prev, lastEvent: payload, isPlaying: true };
      } else {
        tabStates[tabId] = prev;
      }
      // If content changed, reset allowPost until next start decides
      if (contentChanged) {
        tabStates[tabId].lastContentKey = nextKey;
        if (payload.event !== 'start') {
          tabStates[tabId].allowPost = undefined;
        }
      }
    }
    // Decide posting based on backend detection response on start; then gate others
    const id = sender.tab?.id;
    if (typeof id === 'number') {
      const state = tabStates[id] as TabPlaybackState | undefined;
      if (payload.event === 'start' || state?.allowPost === undefined) {
        try { console.debug('[bg] probing start -> backend detection'); } catch {}
        postContentActivityFromPlayback(payload, id).then((result) => {
          if (!tabStates[id]) return;
          if (result && result.saved) {
            tabStates[id].allowPost = true;
            try { console.debug('[bg] backend says saved -> allowPost=true'); } catch {}
          } else if (result && result.reason === 'not_target_language') {
            tabStates[id].allowPost = false;
            try { console.debug('[bg] backend says not target -> allowPost=false'); } catch {}
          } else if (result && result.isWaitingOnLabeling) {
            tabStates[id].allowPost = true; // keep posting while labeling processes
            try { console.debug('[bg] backend waiting on labeling -> allowPost=true'); } catch {}
          } else {
            // default conservative: do not block
            tabStates[id].allowPost = true;
            try { console.debug('[bg] backend unknown result -> allowPost=true'); } catch {}
          }
        });
      } else {
        if (state && state.allowPost) {
          try { console.debug('[bg] allowPost -> posting'); } catch {}
          postContentActivityFromPlayback(payload, id);
        } else {
          try { console.debug('[bg] skip posting (allowPost=false)'); } catch {}
        }
      }
    }
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

