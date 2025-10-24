import type { ActionCtx } from '../../_generated/server';
import type { Id } from '../../_generated/dataModel';
import { internal } from '../../_generated/api';

// Patch type for content label updates (kept minimal for websites)
type ContentLabelPatch = {
	contentUrl?: string;
	contentMediaType?: 'audio' | 'video' | 'text';
	title?: string;
	authorName?: string;
	authorUrl?: string;
	description?: string;
	thumbnailUrl?: string;
	fullDurationInMs?: number;
	// Note: Websites are language-agnostic; do not set contentLanguageCode
	languageEvidence?: string[];
};

export async function processWebsiteContentLabel(
	ctx: ActionCtx,
	{ contentLabelId }: { contentLabelId: Id<'contentLabels'> }
): Promise<{ success: boolean; patch?: ContentLabelPatch; error?: string }> {
	try {
		// Load basic label info (actions use runQuery)
		const basics = await ctx.runQuery(
			internal.labelingEngine.contentLabelFunctions.getLabelBasics,
			{ contentLabelId }
		);

		// Derive domain from contentKey (preferred) or contentUrl fallback
		// Expected contentKey format: "website:<domain>"
		const contentKey = basics?.contentKey ?? '';
		const domainFromKey = contentKey.startsWith('website:')
			? contentKey.split(':')[1]
			: undefined;

		let domain: string | undefined = domainFromKey;
		if (!domain && basics?.contentUrl) {
			try {
				const u = new URL(basics.contentUrl);
				domain = u.hostname.toLowerCase();
			} catch {
				/* noop */
			}
		}

		const title = domain || contentKey || 'website';
		const contentUrl =
			basics?.contentUrl || (domain ? `https://${domain}` : undefined);

		const patch: ContentLabelPatch = {
			contentUrl,
			contentMediaType: 'text',
			title,
		};

		return { success: true, patch };
	} catch (e: any) {
		return { success: false, error: e?.message ?? 'unknown_error' };
	}
}
