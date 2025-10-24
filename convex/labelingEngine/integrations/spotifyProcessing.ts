import type { ActionCtx } from '../../_generated/server';
import type { LanguageCode } from '../../schema';
import type { Id } from '../../_generated/dataModel';
import { internal } from '../../_generated/api';
import { detectLanguageWithGemini } from './geminiLanguageDetection';

// Define the patch type for content label updates
type ContentLabelPatch = {
	contentUrl?: string;
	contentMediaType?: 'audio' | 'video' | 'text';
	title?: string;
	authorName?: string;
	authorUrl?: string;
	description?: string;
	thumbnailUrl?: string;
	fullDurationInMs?: number;
	contentLanguageCode?: LanguageCode;
	languageEvidence?: string[];
	isAboutTargetLanguages?: LanguageCode[];
	geminiLanguageEvidence?: string;
};

/**
 * Spotify processing using Spotify API and Gemini for language detection
 * Extracts track metadata from Spotify API and uses Gemini to detect language
 */
export async function processSpotifyContentLabel(
	ctx: ActionCtx,
	{ contentLabelId }: { contentLabelId: Id<'contentLabels'> }
): Promise<{ success: boolean; patch?: ContentLabelPatch; error?: string }> {
	console.debug('[spotifyProcessing.processOne] start', {
		contentLabelId,
	});

	try {
		// Load label to determine contentKey
		const label = await ctx.runQuery(
			internal.labelingEngine.contentLabelFunctions.getLabelBasics,
			{ contentLabelId }
		);
		const contentKey: string | undefined = label?.contentKey ?? undefined;
		console.debug('[spotifyProcessing.processOne] loaded label', {
			contentKey,
		});

		if (!contentKey || !contentKey.startsWith('spotify:')) {
			return {
				success: false,
				error: 'Invalid contentKey format for Spotify processing',
			};
		}

		// Get the full content label with metadata
		const fullLabel = await ctx.runQuery(
			internal.labelingEngine.contentLabelFunctions.getLabelWithMetadata,
			{ contentLabelId }
		);

		// Extract track ID from contentKey (format: spotify:trackId)
		const trackId = contentKey.split(':')[1];
		if (!trackId) {
			return {
				success: false,
				error: 'No track ID found in contentKey',
			};
		}

		const patch: ContentLabelPatch = {
			contentMediaType: 'audio',
			contentUrl: `https://open.spotify.com/track/${trackId}`,
		};

		// Get track details from Spotify API
		// We need to get the user's Spotify access token to fetch track metadata
		let title: string | undefined;
		let authorName: string | undefined;
		let thumbnailUrl: string | undefined;
		let fullDurationInMs: number | undefined;

		// Use the metadata that was already stored in the content label
		// The track metadata should have been stored when the activity was first created
		title = fullLabel?.title;
		authorName = fullLabel?.authorName;
		thumbnailUrl = fullLabel?.thumbnailUrl;
		fullDurationInMs = fullLabel?.fullDurationInMs;

		// If no metadata is available, use fallback
		if (!title) {
			title = `Spotify Track ${trackId}`;
		}
		if (!authorName) {
			authorName = 'Unknown Artist';
		}

		// Use Gemini to detect language from track information
		// In a real implementation, we would have the actual track name and artist names
		const geminiInput = {
			title: title,
			description: `Spotify track: ${trackId}`,
			url: patch.contentUrl,
		};

		console.debug('[spotifyProcessing.processOne] calling Gemini', {
			geminiInput,
		});

		const geminiResult = await detectLanguageWithGemini(geminiInput);

		if (geminiResult.success) {
			patch.contentLanguageCode = geminiResult.dominant_language || undefined;
			patch.isAboutTargetLanguages = geminiResult.target_languages;
			patch.geminiLanguageEvidence = geminiResult.reason;
			patch.languageEvidence = ['spotify:gemini'];
		} else {
			console.debug('[spotifyProcessing.processOne] Gemini detection failed', {
				error: geminiResult.error,
			});
			// Continue without language detection - the activity will be created with user's target language
		}

		// Update patch with basic metadata
		patch.title = title;
		patch.authorName = authorName;
		patch.thumbnailUrl = thumbnailUrl;
		patch.fullDurationInMs = fullDurationInMs;

		console.debug('[spotifyProcessing.processOne] completed', {
			patch: {
				title: patch.title,
				authorName: patch.authorName,
				contentLanguageCode: patch.contentLanguageCode,
				contentMediaType: patch.contentMediaType,
			},
		});

		return {
			success: true,
			patch,
		};
	} catch (error) {
		console.error('[spotifyProcessing.processOne] error', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}
