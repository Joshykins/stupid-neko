// Auto-discovered provider registry for background and content

export type ProviderId = string;

export type ProviderMeta = {
	id: ProviderId;
	displayName?: string;
	matches: (url: string) => boolean;
	extractContentKey: (url: string) => string | null;
};

// Eagerly import metas so we can match synchronously in background
const metaModules = import.meta.glob("./**/meta.ts", { eager: true }) as Record<
	string,
	{ default: ProviderMeta }
>;

export const metas: ProviderMeta[] = Object.values(metaModules).map(
	(m) => m.default,
);

// Lazy loaders for content/background modules
export const loadContent: Record<string, () => Promise<unknown>> =
	import.meta.glob("./**/content.ts");

export const loadBackground: Record<string, () => Promise<unknown>> =
	import.meta.glob("./**/background.ts");

// Helper to find meta for a URL, falling back to `default`
export function getMetaForUrl(url: string): ProviderMeta {
	const m = metas.find((mm) => {
		try {
			return mm.matches(url);
		} catch {
			return false;
		}
	});
	// Fallback to default by id
	// biome-ignore lint/style/noNonNullAssertion: "m is guaranteed to be defined"
	return m ?? metas.find((mm) => mm.id === "default")!;
}
