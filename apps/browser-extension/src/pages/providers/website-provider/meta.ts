import type { ProviderMeta } from '../registry';

const meta: ProviderMeta = {
	id: 'website-provider' as const,
	displayName: 'Website',
	matches: () => true,
	extractContentKey: (url: string) => {
		try {
			const u = new URL(url);
			return `website:${u.hostname.toLowerCase()}`;
		} catch {
			return null;
		}
	},
};

export default meta;

