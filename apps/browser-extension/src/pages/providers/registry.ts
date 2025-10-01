// Auto-discovered provider registry for background and content

import type { ProviderName } from '../background/providers/types';

export type ProviderId = ProviderName;

export type ProviderMeta = {
	id: ProviderId;
	displayName?: string;
	matches: (url: string) => boolean;
	extractContentKey: (url: string) => string | null;
};

// Eagerly import metas so we can match synchronously in background
const metaModules = import.meta.glob('./**/meta.ts', { eager: true }) as Record<
	string,
	{ default: ProviderMeta }
>;

// Load all providers and sort them so specific providers come before the default
const allMetas = Object.values(metaModules).map(m => m.default);
export const metas: ProviderMeta[] = allMetas.sort((a, b) => {
	// Put default provider last, all others first
	if (a.id === 'default') return 1;
	if (b.id === 'default') return -1;
	return 0;
});

// Lazy loaders for content/background modules
export const loadContent: Record<string, () => Promise<unknown>> =
	import.meta.glob('./**/content.ts');

export const loadBackground: Record<string, () => Promise<unknown>> =
	import.meta.glob('./**/background.ts');

// Helper to find meta for a URL, falling back to `default`
export function getMetaForUrl(url: string): ProviderMeta {
	const m = metas.find(mm => {
		try {
			return mm.matches(url);
		} catch {
			return false;
		}
	});
	// Fallback to default by id
	// biome-ignore lint/style/noNonNullAssertion: "m is guaranteed to be defined"
	return m ?? metas.find(mm => mm.id === 'default')!;
}
