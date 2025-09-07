import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const handlePlayback = internalMutation({
    args: v.object({
        source: v.union(
            v.literal("youtube"),
            v.literal("spotify"),
            v.literal("anki"),
            v.literal("manual"),
        ),
        event: v.string(),
        url: v.optional(v.string()),
        title: v.optional(v.string()),
        videoId: v.optional(v.string()),
        ts: v.optional(v.number()),
        position: v.optional(v.number()),
        duration: v.optional(v.number()),
        rate: v.optional(v.number()),
    }),
    returns: v.object({
        ok: v.boolean(),
        contentLabelId: v.optional(v.id("contentLabel")),
        contentKey: v.optional(v.string()),
        stage: v.optional(v.union(
            v.literal("queued"),
            v.literal("processing"),
            v.literal("completed"),
            v.literal("failed"),
        )),
        existed: v.optional(v.boolean()),
    }),
    handler: async (ctx, args): Promise<{
        ok: true;
        labeledContentId?: any;
        key?: string;
        stage?: "queued" | "processing" | "completed" | "failed";
        existed?: boolean;
    }> => {
        console.debug("[extensionPlayback] handlePlayback", args);
        // For YouTube events, ensure labeledContent exists by key
        if (args.source === "youtube" && (args.videoId || args.url)) {
            let videoId: string | null = args.videoId ?? null;
            if (!videoId && typeof args.url === "string") {
                try {
                    const u = new URL(args.url);
                    if (u.hostname.includes("youtube.com")) videoId = u.searchParams.get("v");
                    else if (u.hostname === "youtu.be") videoId = u.pathname.replace(/^\//, "");
                } catch {}
            }
            if (videoId) {
                const url: string = (typeof args.url === "string" && args.url)
                    ? args.url
                    : `https://www.youtube.com/watch?v=${videoId}`;
                console.debug("[extensionPlayback] enqueue youtube", { videoId, url });
                const result: {
                    contentLabelId: any;
                    contentKey: string;
                    stage: "queued" | "processing" | "completed" | "failed";
                    existed: boolean;
                } = await ctx.runMutation(internal.contentYoutubeLabeling.getOrEnqueue, {
                    videoId,
                    url,
                });
                console.debug("[extensionPlayback] enqueue result", result);
                return { ok: true, ...result } as const;
            }
        }
        return { ok: true } as const;
    },
});


