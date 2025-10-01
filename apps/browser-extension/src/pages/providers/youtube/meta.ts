import type { ProviderMeta } from '../registry';

function deriveYouTubeId(input: string): string | null {
	try {
		// direct ID
		if (/^[A-Za-z0-9_-]{6,}$/i.test(input) && !input.includes('http')) {
			return input;
		}
		const url = new URL(input);
		if (url.hostname.includes('youtube.com')) {
			const v = url.searchParams.get('v');
			if (v) return v;
			if (url.pathname.startsWith('/shorts/')) {
				const segs = url.pathname.split('/').filter(Boolean);
				return segs[1] || null;
			}
		}
		if (input.includes('youtu.be')) {
			const u2 = new URL(input);
			const seg = u2.pathname.replace(/^\//, '');
			return seg || null;
		}
		return null;
	} catch {
		return null;
	}
}

const meta: ProviderMeta = {
	id: 'youtube' as const,
	displayName: 'YouTube',
	matches: (url: string) => {
		try {
			const h = new URL(url).hostname;
			return /(\.|^)youtube\.com$/.test(h) || /(\.|^)youtu\.be$/.test(h);
		} catch {
			return false;
		}
	},
	extractContentKey: (url: string) => {
		const vid = deriveYouTubeId(url);
		return vid ? `youtube:${vid}` : null;
	},
};

export default meta;
