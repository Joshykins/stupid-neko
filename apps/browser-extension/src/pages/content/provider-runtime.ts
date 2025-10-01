import { onContent } from '../../messaging/messagesContentRouter';
import type { ContentActivityEvent } from '../background/providers/types';
import { loadContent } from '../providers/registry';

// Debug: Log when provider runtime is initialized
console.debug('[content] Provider runtime initialized - onContent handlers registered');

// Minimal content-side runtime to activate/deactivate providers by id

type ProviderContent = {
	start(cb: (e: ContentActivityEvent) => void, targetLanguage?: string): void;
	stop(): void;
};

let active: { id: string; api: ProviderContent } | null = null;

onContent('ACTIVATE_PROVIDER', async ({ providerId, targetLanguage }) => {
	try {
		console.debug('[content] onContent ACTIVATE_PROVIDER handler called:', { providerId, targetLanguage });
		
		if (active?.id === providerId) {
			console.debug('[content] Provider already active:', providerId);
			return {};
		}
		if (active) {
			console.debug('[content] Stopping previous provider:', active.id);
			try {
				active.api.stop();
			} catch {}
			active = null;
		}

		const key = Object.keys(loadContent).find(k =>
			k.includes(`/${providerId}/`)
		);
		if (!key) {
			console.error('[content] Provider content not found:', providerId);
			return { error: `Provider content not found: ${providerId}` } as any;
		}

		console.debug('[content] Loading provider content:', key);
		const mod: any = await loadContent[key]!();
		const api: ProviderContent = mod.default;

		console.debug('[content] Starting provider:', providerId);
		api.start((_e: ContentActivityEvent) => {
			// The provider wrapper already forwards to background; no-op here
		}, targetLanguage);

		active = { id: providerId, api };
		console.debug('[content] Provider activated:', providerId);
		return {};
	} catch (e) {
		console.error('[content] Error activating provider:', e);
		return { error: String(e) } as any;
	}
});

onContent('DEACTIVATE_PROVIDER', async () => {
	if (active) {
		try {
			active.api.stop();
		} catch {}
		active = null;
	}
	return {};
});
