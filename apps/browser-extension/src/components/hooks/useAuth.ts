import { useEffect, useState } from 'react';

// Mirrors convex/meFunctions.ts -> me return shape
export type AuthMe = {
  name?: string;
  email?: string;
  image?: string;
  username?: string;
  timezone?: string;
  // Derived from user's current target language
  languageCode?: string;
  // Streak fields merged from getUserProgress in /extension/me
  currentStreak?: number;
  longestStreak?: number;
  // Allow future fields; keep forward compatible with backend additions
  [key: string]: unknown;
};

export type AuthState = {
  isAuthed: boolean;
  me: AuthMe | null;
  loading: boolean;
  error?: string;
};

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ isAuthed: false, me: null, loading: true });
  useEffect(() => {
    let mounted = true;
    try {
      chrome.runtime.sendMessage({ type: 'GET_AUTH_STATE' }, (resp) => {
        if (!mounted) return;
        const r = (resp as { isAuthed?: boolean; me?: Partial<AuthMe> | null } | null) || {};
        const me: AuthMe | null = r?.me ? ({ ...r.me } as AuthMe) : null;
        setState({ isAuthed: !!r?.isAuthed, me, loading: false });
      });
    } catch (e: any) {
      if (!mounted) return;
      setState({ isAuthed: false, me: null, loading: false, error: e?.message || 'failed' });
    }
    return () => { mounted = false; };
  }, []);
  return state;
}


