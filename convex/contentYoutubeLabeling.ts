import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { type LanguageCode } from "./schema";

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
    status?: {
      uploadStatus: string;
      privacyStatus: string;
      license: string;
      embeddable: boolean;
      publicStatsViewable: boolean;
    };
    recordingDetails?: {
      recordingDate?: string;
      location?: {
        latitude: number;
        longitude: number;
        altitude?: number;
      };
    };
    liveStreamingDetails?: {
      actualStartTime?: string;
      actualEndTime?: string;
      scheduledStartTime?: string;
      scheduledEndTime?: string;
      concurrentViewers?: string;
    };
  }
  
  interface YouTubeChannelData {
    kind: 'youtube#channel';
    etag: string;
    id: string;
    snippet: {
      title: string;
      description: string;
      customUrl?: string;
      publishedAt: string;
      thumbnails: YouTubeVideoSnippet['thumbnails'];
      country?: string;
    };
    statistics: {
      viewCount: string;
      subscriberCount: string;
      hiddenSubscriberCount: boolean;
      videoCount: string;
    };
    contentDetails: {
      relatedPlaylists: {
        likes?: string;
        uploads: string;
      };
    };
  }
  
  interface YouTubePlaylistData {
    kind: 'youtube#playlist';
    etag: string;
    id: string;
    snippet: {
      publishedAt: string;
      channelId: string;
      title: string;
      description: string;
      thumbnails: YouTubeVideoSnippet['thumbnails'];
      channelTitle: string;
      defaultLanguage?: string;
    };
    contentDetails: {
      itemCount: number;
    };
  }
  
  type YouTubeMetadataResponse = 
    | { type: 'video'; id: string; data: YouTubeVideoData | null }
    | { type: 'channel'; id: string; data: YouTubeChannelData | null }
    | { type: 'playlist'; id: string; data: YouTubePlaylistData | null };
  


 
    async function getYouTubeMetadata(url: string, apiKey: string): Promise<YouTubeMetadataResponse> {
            console.debug("[getYouTubeMetadata] start", { url, hasKey: Boolean(apiKey) });
            // Parse the input URL to determine type and extract ID
            const parsed = parseYouTubeUrl(url);
            console.debug("[getYouTubeMetadata] parsed", parsed);

            const baseUrl = 'https://www.googleapis.com/youtube/v3/';

            let endpoint: string;
            let parts: string;

            switch (parsed.type) {
              case 'video_id':
                endpoint = 'videos';
                parts = 'snippet,statistics,recordingDetails,status,liveStreamingDetails,localizations,contentDetails,topicDetails';
                break;
              case 'channel_id':
                endpoint = 'channels';
                parts = 'snippet,statistics,brandingSettings,contentDetails,localizations,status,topicDetails';
                break;
              case 'playlist_id':
                endpoint = 'playlists';
                parts = 'snippet,status,localizations,contentDetails';
                break;
              default:
                console.debug("[getYouTubeMetadata] invalid url", { url, parsed });
                throw new Error('Invalid YouTube URL');
            }

            const requestUrl = `${baseUrl}${endpoint}?part=${parts}&id=${parsed.value}&key=${apiKey}`;
            console.debug("[getYouTubeMetadata] request", { endpoint, hasKey: Boolean(apiKey), id: parsed.value });
            try {
              const response = await fetch(requestUrl);
              const ok = response.ok;
              const status = response.status;
              if (!ok) {
                const text = await response.text().catch(() => "");
                console.debug("[getYouTubeMetadata] http error", { status, body: text.slice(0, 200) });
              } else {
                console.debug("[getYouTubeMetadata] http ok", { status });
              }
              const data = await response.json().catch(() => ({} as any));
              const first = Array.isArray((data as any).items) ? (data as any).items[0] : null;
              const result: YouTubeMetadataResponse = {
                type: parsed.type.replace('_id', '') as 'video' | 'channel' | 'playlist',
                id: parsed.value,
                data: first || null,
              } as any;
              console.debug("[getYouTubeMetadata] done", { type: result.type, id: result.id, hasData: Boolean(result.data) });
              return result;
            } catch (e: any) {
              console.debug("[getYouTubeMetadata] fetch error", { message: e?.message });
              throw e;
            }
          }
          
    function parseYouTubeUrl(input: string): { type: string; value: string } {
      // Simplified URL parsing - you'd want more robust parsing
      if (input.includes('watch?v=') || input.includes('youtu.be/')) {
        const videoId = input.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
        return { type: 'video_id', value: videoId || '' };
      }
      if (input.includes('/channel/')) {
        const channelId = input.match(/\/channel\/([^\/\n?#]+)/)?.[1];
        return { type: 'channel_id', value: channelId || '' };
      }
      if (input.includes('playlist?list=')) {
        const playlistId = input.match(/playlist\?list=([^&\n?#]+)/)?.[1];
        return { type: 'playlist_id', value: playlistId || '' };
      }
      throw new Error('Unsupported URL format');
    }


// Process one YouTube content label (provider-specific)
export const processOneYoutubeContentLabel = internalAction({
    args: v.object({ contentLabelId: v.id("contentLabel") }),
    returns: v.union(
        v.object({ contentLabelId: v.id("contentLabel"), stage: v.literal("completed") }),
        v.object({ contentLabelId: v.id("contentLabel"), stage: v.literal("failed") }),
    ),
    handler: async (ctx, args) => {
        console.debug("[contentYoutubeLabeling.processOne] start", { contentLabelId: args.contentLabelId });
        await ctx.runMutation(internal.contentLabeling.markProcessing, { contentLabelId: args.contentLabelId });
        try {
            // Load label to determine URL/key (actions have no DB access)
            const label = await ctx.runQuery(internal.contentLabeling.getLabelBasics, { contentLabelId: args.contentLabelId });
            const contentUrl: string | undefined = label?.contentUrl ?? undefined;
            const contentKey: string | undefined = label?.contentKey ?? undefined;
            console.debug("[contentYoutubeLabeling.processOne] loaded label", { contentUrl, contentKey });

            const url = contentUrl
                ?? (contentKey && contentKey.startsWith("youtube:")
                    ? `https://www.youtube.com/watch?v=${contentKey.split(":")[1]}`
                    : undefined);
            console.debug("[contentYoutubeLabeling.processOne] resolved url", { url });

            // Best-effort metadata enrichment
            const apiKey = process.env.YOUTUBE_API_KEY || "";
            console.debug("[contentYoutubeLabeling.processOne] apiKey present?", { hasKey: Boolean(apiKey) });
            let patch: any = { contentMediaType: "video" };
            if (url && apiKey) {
                const meta = await getYouTubeMetadata(url, apiKey);
                console.debug("[contentYoutubeLabeling.processOne] fetched metadata", { type: meta.type, id: meta.id, hasData: Boolean((meta as any).data) });
                if (meta.type === 'video' && meta.data) {
                    const vid = meta.data;
                    // Title / author / thumbnails
                    patch.title = vid.snippet?.title ?? patch.title;
                    patch.authorName = vid.snippet?.channelTitle ?? patch.authorName;
                    const channelId = vid.snippet?.channelId;
                    if (channelId) patch.authorUrl = `https://www.youtube.com/channel/${channelId}`;
                    const thumbs = vid.snippet?.thumbnails;
                    const thumbUrl = thumbs?.maxres?.url || thumbs?.high?.url || thumbs?.medium?.url || thumbs?.default?.url;
                    if (thumbUrl) patch.thumbnailUrl = thumbUrl;
                    // Description (shorten to avoid 1MB limits if needed)
                    if (vid.snippet?.description) patch.description = vid.snippet.description.slice(0, 5000);

                    // Duration parse from ISO8601
                    const iso = vid.contentDetails?.duration;
                    if (iso) patch.fullDurationInSeconds = iso8601ToSeconds(iso);

                    // Language inference
                    const defaultAudioLang = vid.snippet?.defaultAudioLanguage;
                    const defaultLang = vid.snippet?.defaultLanguage;
                    const lang: LanguageCode | undefined = mapToSupportedLanguageCode(defaultAudioLang || defaultLang || "");
                    if (lang) {
                        patch.contentLanguageCode = lang;
                        patch.languageEvidence = [
                            defaultAudioLang ? `yt:defaultAudioLanguage:${defaultAudioLang}` : undefined,
                            defaultLang ? `yt:defaultLanguage:${defaultLang}` : undefined,
                        ].filter(Boolean);
                    }
                    console.debug("[contentYoutubeLabeling.processOne] built patch", {
                        title: patch.title,
                        authorName: patch.authorName,
                        hasThumb: Boolean(patch.thumbnailUrl),
                        fullDurationInSeconds: patch.fullDurationInSeconds,
                        contentLanguageCode: patch.contentLanguageCode,
                    });
                }
            }

            await ctx.runMutation(internal.contentLabeling.completeWithPatch, {
                contentLabelId: args.contentLabelId,
                patch,
            });
            console.debug("[contentYoutubeLabeling.processOne] completed", { contentLabelId: args.contentLabelId });
            return { contentLabelId: args.contentLabelId, stage: "completed" } as const;
        } catch (e: any) {
            console.debug("[contentYoutubeLabeling.processOne] failed", { contentLabelId: args.contentLabelId, error: e?.message });
            await ctx.runMutation(internal.contentLabeling.markFailed, { contentLabelId: args.contentLabelId, error: e?.message ?? "unknown_error" });
            return { contentLabelId: args.contentLabelId, stage: "failed" } as const;
        }
    },
});



function iso8601ToSeconds(iso: string): number {
    // PT#H#M#S
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || "0", 10);
    const minutes = parseInt(match[2] || "0", 10);
    const seconds = parseInt(match[3] || "0", 10);
    return hours * 3600 + minutes * 60 + seconds;
}

function mapToSupportedLanguageCode(raw: string): LanguageCode | undefined {
    const lower = raw.toLowerCase();
    if (!lower) return undefined;
    if (lower.startsWith("en")) return "en";
    if (lower.startsWith("ja") || lower.startsWith("jp")) return "ja";
    if (lower.startsWith("es")) return "es";
    if (lower.startsWith("fr")) return "fr";
    if (lower.startsWith("de")) return "de";
    if (lower.startsWith("ko")) return "ko";
    if (lower.startsWith("it")) return "it";
    if (lower.startsWith("zh") || lower.startsWith("cmn") || lower.startsWith("yue")) return "zh";
    if (lower.startsWith("hi")) return "hi";
    if (lower.startsWith("ru")) return "ru";
    if (lower.startsWith("ar")) return "ar";
    if (lower.startsWith("pt")) return "pt";
    if (lower.startsWith("tr")) return "tr";
    return undefined;
}

