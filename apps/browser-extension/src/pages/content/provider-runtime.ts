import { onContent } from '../../messaging/messagesContentRouter';
import type { ContentActivityEvent } from '../background/providers/types';
import { loadContent } from '../providers/registry';

import { createLogger } from '../../lib/logger';
const log = createLogger('content', 'providers:activation');

// Debug: Log when provider runtime is initialized
log.debug('Provider runtime initialized - onContent handlers registered');

// Minimal content-side runtime to activate/deactivate providers by id

type ProviderContent = {
	start(cb: (e: ContentActivityEvent) => void, targetLanguage?: string): void;
	stop(): void;
};

let active: { id: string; api: ProviderContent } | null = null;

onContent('ACTIVATE_PROVIDER', async ({ providerId, targetLanguage }) => {
	try {
		log.debug('onContent ACTIVATE_PROVIDER handler called:', {
			providerId,
			targetLanguage,
		});

		if (active?.id === providerId) {
			log.debug('Provider already active:', providerId);
			return {};
		}
		if (active) {
			log.debug('Stopping previous provider:', active.id);
			try {
				active.api.stop();
			} catch {
				/* noop */
			}
			active = null;
		}

		const key = Object.keys(loadContent).find(k =>
			k.includes(`/${providerId}/`)
		);
		if (!key) {
			log.error('Provider content not found:', providerId);
			return { error: `Provider content not found: ${providerId}` };
		}

		log.debug('Loading provider content:', key);
		const mod = (await loadContent[key]!()) as { default: ProviderContent };
		const api: ProviderContent = mod.default;

		log.debug('Starting provider:', providerId);
		api.start((_e: ContentActivityEvent) => {
			// The provider wrapper already forwards to background; no-op here
		}, targetLanguage);

		active = { id: providerId, api };
		log.debug('Provider activated:', providerId);
		return {};
	} catch (e) {
		log.error('Error activating provider:', e);
		return { error: String(e) };
	}
});

onContent('DEACTIVATE_PROVIDER', async () => {
	if (active) {
		try {
			active.api.stop();
		} catch {
			/* noop */
		}
		active = null;
	}
	return {};
});
