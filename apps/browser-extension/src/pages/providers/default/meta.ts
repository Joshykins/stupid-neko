import type { ProviderMeta } from '../registry';

const meta: ProviderMeta = {
	id: 'default' as const,
	displayName: 'Website',
	matches: () => true,
	extractContentKey: (url: string) => {
		try {
			const u = new URL(url);
			return `website:${u.hostname}${u.pathname}`;
		} catch {
			return null;
		}
	},
};

export default meta;
