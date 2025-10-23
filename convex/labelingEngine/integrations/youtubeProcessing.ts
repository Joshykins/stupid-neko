import type { ActionCtx } from '../../_generated/server';
import type { LanguageCode } from '../../schema';
import type { Id } from '../../_generated/dataModel';
import { internal } from '../../_generated/api';
import { detectLanguageWithGemini } from './geminiLanguageDetection';
import { tryCatch } from '../../../lib/tryCatch';

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
 * Pure Gemini-based YouTube processing
 * No YouTube API calls - relies entirely on Gemini for language detection
 * and basic URL parsing for minimal metadata
 */
export async function processYouTubeContentLabel(
	ctx: ActionCtx,
	{ contentLabelId }: { contentLabelId: Id<'contentLabels'> }
): Promise<{ success: boolean; patch?: ContentLabelPatch; error?: string }> {
	console.debug('[youtubeProcessing.processOne] start', {
		contentLabelId,
	});

	try {
		// Load label to determine URL/key (actions have no DB access)
		const label = await ctx.runQuery(
			internal.labelingEngine.contentLabelFunctions.getLabelBasics,
			{ contentLabelId }
		);
		const contentUrl: string | undefined = label?.contentUrl ?? undefined;
		const contentKey: string | undefined = label?.contentKey ?? undefined;
		console.debug('[youtubeProcessing.processOne] loaded label', {
			contentUrl,
			contentKey,
		});

		const url =
			contentUrl ??
			(contentKey && contentKey.startsWith('youtube:')
				? `https://www.youtube.com/watch?v=${contentKey.split(':')[1]}`
				: undefined);
		console.debug('[youtubeProcessing.processOne] resolved url', {
			url,
		});

		const patch: ContentLabelPatch = { 
			contentMediaType: 'video',
			contentUrl: url
		};

		// Extract basic info from URL if possible
		if (url) {
			const videoId = extractVideoId(url);
			if (videoId.type === 'video_id') {
				// Generate basic thumbnail URL (YouTube provides default thumbnails without API)
				patch.thumbnailUrl = `https://i.ytimg.com/vi/${videoId.value}/maxresdefault.jpg`;
			}
		}

		// Get title and description from YouTube API (minimal usage - only for Gemini analysis)
		let title: string | undefined;
		let description: string | undefined;
		let authorName: string | undefined;
		let authorUrl: string | undefined;

		const apiKey = process.env.YOUTUBE_API_KEY || '';
		if (url && apiKey) {
			const videoId = extractVideoId(url);
			if (videoId.type === 'video_id') {
				const { data: response, error } = await tryCatch(
					fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId.value}&key=${apiKey}`)
				);
				
				if (error) {
					console.debug('[youtubeProcessing.processOne] YouTube API call failed', { error: error.message });
				} else if (response) {
					const { data, error: jsonError } = await tryCatch(response.json());
					
					if (jsonError) {
						console.debug('[youtubeProcessing.processOne] YouTube API JSON parse failed', { error: jsonError.message });
					} else if (data?.items && data.items.length > 0) {
						const snippet = data.items[0].snippet;
						title = snippet?.title;
						description = snippet?.description?.slice(0, 5000); // Limit description length
						authorName = snippet?.channelTitle;
						if (snippet?.channelId) {
							authorUrl = `https://www.youtube.com/channel/${snippet.channelId}`;
						}
					}
				}
			}
		}

		// Update patch with basic metadata
		if (title) patch.title = title;
		if (authorName) patch.authorName = authorName;
		if (authorUrl) patch.authorUrl = authorUrl;
		if (description) patch.description = description;

		// PRIMARY: Use Gemini for all language detection and content analysis
		console.debug('[youtubeProcessing.processOne] running Gemini language detection', {
			url,
			title,
			description,
			hasYouTubeData: Boolean(title && description)
		});

		const geminiResult = await detectLanguageWithGemini({
			url: url,
			title: title,
			description: description
		});

		if (geminiResult.success && geminiResult.target_languages.length > 0) {
			// Use Gemini's dominant language as the primary content language
			patch.contentLanguageCode = geminiResult.dominant_language || undefined;
			patch.isAboutTargetLanguages = geminiResult.target_languages;
			patch.geminiLanguageEvidence = geminiResult.reason;
			patch.languageEvidence = [`gemini:detection:${geminiResult.reason}`];

			console.debug('[youtubeProcessing.processOne] Gemini detection completed', {
				target_languages: geminiResult.target_languages,
				dominant_language: geminiResult.dominant_language,
				reason: geminiResult.reason
			});
		} else {
			// No language detected - mark as unknown
			patch.languageEvidence = ['gemini:detection:failed'];
			console.debug('[youtubeProcessing.processOne] Gemini detection failed', {
				error: geminiResult.error,
				reason: geminiResult.reason
			});
		}

		console.debug('[youtubeProcessing.processOne] built patch', {
			contentUrl: patch.contentUrl,
			contentMediaType: patch.contentMediaType,
			hasThumb: Boolean(patch.thumbnailUrl),
			contentLanguageCode: patch.contentLanguageCode,
			isAboutTargetLanguages: patch.isAboutTargetLanguages,
			hasGeminiEvidence: Boolean(patch.geminiLanguageEvidence),
		});

		console.debug('[youtubeProcessing.processOne] completed', {
			contentLabelId,
		});
		return {
			success: true,
			patch,
		};
	} catch (e: any) {
		console.debug('[youtubeProcessing.processOne] failed', {
			contentLabelId,
			error: e?.message,
		});
		return {
			success: false,
			error: e?.message ?? 'unknown_error',
		};
	}
}

// Helper function to extract video ID from URL
function extractVideoId(url: string): { type: 'video_id' | 'unknown'; value: string } {
	const videoRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
	const match = url.match(videoRegex);
	if (match) {
		return { type: 'video_id', value: match[1] };
	}
	return { type: 'unknown', value: '' };
}