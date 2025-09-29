import type { ActionCtx } from '../../_generated/server';
import type { LanguageCode } from '../../schema';
import type { Id } from '../../_generated/dataModel';
import { internal } from '../../_generated/api';

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
};

interface YouTubeVideoSnippet {
	publishedAt: string;
	channelId: string;
	title: string;
	description: string;
	thumbnails: {
		default?: { url: string; width: number; height: number };
		medium?: { url: string; width: number; height: number };
		high?: { url: string; width: number; height: number };
		standard?: { url: string; width: number; height: number };
		maxres?: { url: string; width: number; height: number };
	};
	channelTitle: string;
	tags?: string[];
	categoryId: string;
	liveBroadcastContent: string;
	defaultLanguage?: string;
	defaultAudioLanguage?: string;
}

interface YouTubeVideoStatistics {
	viewCount: string;
	likeCount?: string;
	favoriteCount: string;
	commentCount?: string;
}

interface YouTubeVideoContentDetails {
	duration: string;
	dimension: string;
	definition: string;
	caption: string;
	licensedContent: boolean;
	regionRestriction?: {
		allowed?: string[];
		blocked?: string[];
	};
}

interface YouTubeVideoData {
	kind: 'youtube#video';
	etag: string;
	id: string;
	snippet: YouTubeVideoSnippet;
	statistics: YouTubeVideoStatistics;
	contentDetails: YouTubeVideoContentDetails;
}

interface YouTubePlaylistSnippet {
	publishedAt: string;
	channelId: string;
	title: string;
	description: string;
	thumbnails: {
		default?: { url: string; width: number; height: number };
		medium?: { url: string; width: number; height: number };
		high?: { url: string; width: number; height: number };
		standard?: { url: string; width: number; height: number };
		maxres?: { url: string; width: number; height: number };
	};
	channelTitle: string;
	defaultLanguage?: string;
}

interface YouTubePlaylistData {
	kind: 'youtube#playlist';
	etag: string;
	id: string;
	snippet: YouTubePlaylistSnippet;
	contentDetails: {
		itemCount: number;
	};
}

type YouTubeMetadata = 
	| { type: 'video'; id: string; data: YouTubeVideoData }
	| { type: 'playlist'; id: string; data: YouTubePlaylistData }
	| { type: 'unknown'; id: string; data: null };

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

		// Best-effort metadata enrichment
		const apiKey = process.env.YOUTUBE_API_KEY || '';
		console.debug('[youtubeProcessing.processOne] apiKey present?', {
			hasKey: Boolean(apiKey),
		});
		const patch: ContentLabelPatch = { contentMediaType: 'video' };
		if (url && apiKey) {
			const meta = await getYouTubeMetadata(url, apiKey);
			console.debug('[youtubeProcessing.processOne] fetched metadata', {
				type: meta.type,
				id: meta.id,
				hasData: Boolean((meta as any).data),
			});
			if (meta.type === 'video' && meta.data) {
				const vid = meta.data;
				// Title / author / thumbnails
				patch.title = vid.snippet?.title ?? patch.title;
				patch.authorName = vid.snippet?.channelTitle ?? patch.authorName;
				const channelId = vid.snippet?.channelId;
				if (channelId)
					patch.authorUrl = `https://www.youtube.com/channel/${channelId}`;
				const thumbs = vid.snippet?.thumbnails;
				const thumbUrl =
					thumbs?.maxres?.url ||
					thumbs?.high?.url ||
					thumbs?.medium?.url ||
					thumbs?.default?.url;
				if (thumbUrl) patch.thumbnailUrl = thumbUrl;
				// Description (shorten to avoid 1MB limits if needed)
				if (vid.snippet?.description)
					patch.description = vid.snippet.description.slice(0, 5000);

				// Duration parse from ISO8601
				const iso = vid.contentDetails?.duration;
				if (iso) patch.fullDurationInMs = iso8601ToSeconds(iso) * 1000;

				// Language inference
				const defaultAudioLang = vid.snippet?.defaultAudioLanguage;
				const defaultLang = vid.snippet?.defaultLanguage;
				const lang: LanguageCode | undefined = mapToSupportedLanguageCode(
					defaultAudioLang || defaultLang || ''
				);
				if (lang) {
					patch.contentLanguageCode = lang;
					patch.languageEvidence = [
						defaultAudioLang
							? `yt:defaultAudioLanguage:${defaultAudioLang}`
							: undefined,
						defaultLang ? `yt:defaultLanguage:${defaultLang}` : undefined,
					].filter((item): item is string => item !== undefined);
				}
				console.debug('[youtubeProcessing.processOne] built patch', {
					title: patch.title,
					authorName: patch.authorName,
					hasThumb: Boolean(patch.thumbnailUrl),
					fullDurationInMs: patch.fullDurationInMs,
					contentLanguageCode: patch.contentLanguageCode,
				});
			}
		}

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

// Helper functions (copied from the original file)
function iso8601ToSeconds(iso: string): number {
	// PT#H#M#S
	const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
	if (!match) return 0;
	const hours = parseInt(match[1] || '0', 10);
	const minutes = parseInt(match[2] || '0', 10);
	const seconds = parseInt(match[3] || '0', 10);
	return hours * 3600 + minutes * 60 + seconds;
}

function mapToSupportedLanguageCode(ytLang: string): LanguageCode | undefined {
	// Map YouTube language codes to our supported language codes
	const langMap: Record<string, LanguageCode> = {
		'en': 'en',
		'es': 'es',
		'fr': 'fr',
		'de': 'de',
		'it': 'it',
		'pt': 'pt',
		'ru': 'ru',
		'ja': 'ja',
		'ko': 'ko',
		'zh': 'zh',
		'zh-CN': 'zh',
		'zh-TW': 'zh',
		'ar': 'ar',
		'hi': 'hi',
		// All other languages fallback to English
	};
	return langMap[ytLang] || 'en';
}

async function getYouTubeMetadata(url: string, apiKey: string): Promise<YouTubeMetadata> {
	// Extract video ID or playlist ID from URL
	const videoId = extractVideoId(url);
	const playlistId = extractPlaylistId(url);
	
	if (videoId.type === 'video_id') {
		const response = await fetch(
			`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId.value}&key=${apiKey}`
		);
		const data = await response.json();
		
		if (data.items && data.items.length > 0) {
			return {
				type: 'video',
				id: videoId.value,
				data: data.items[0] as YouTubeVideoData,
			};
		}
	}
	
	if (playlistId.type === 'playlist_id') {
		const response = await fetch(
			`https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistId.value}&key=${apiKey}`
		);
		const data = await response.json();
		
		if (data.items && data.items.length > 0) {
			return {
				type: 'playlist',
				id: playlistId.value,
				data: data.items[0] as YouTubePlaylistData,
			};
		}
	}
	
	return {
		type: 'unknown',
		id: videoId.value || playlistId.value || '',
		data: null,
	};
}

function extractVideoId(url: string): { type: 'video_id' | 'unknown'; value: string } {
	const videoRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
	const match = url.match(videoRegex);
	if (match) {
		return { type: 'video_id', value: match[1] };
	}
	return { type: 'unknown', value: '' };
}

function extractPlaylistId(url: string): { type: 'playlist_id' | 'unknown'; value: string } {
	const playlistRegex = /[?&]list=([^&\n?#]+)/;
	const match = url.match(playlistRegex);
	if (match) {
		return { type: 'playlist_id', value: match[1] };
	}
	return { type: 'unknown', value: '' };
}
