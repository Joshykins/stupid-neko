import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { contentSourceValidator, languageCodeValidator, mediaTypeValidator } from "./schema";

// Base: create or return contentLabel by key and source
export const getOrEnqueue = internalMutation({
    args: v.object({
        contentKey: v.string(), // e.g. "youtube:VIDEO_ID"
        contentSource: contentSourceValidator,
        contentUrl: v.optional(v.string()),
    }),
    returns: v.object({
        contentLabelId: v.id("contentLabel"),
        contentKey: v.string(),
        stage: v.union(
            v.literal("queued"),
            v.literal("processing"),
            v.literal("completed"),
            v.literal("failed"),
        ),
        existed: v.boolean(),
    }),
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("contentLabel")
            .withIndex("by_content_key", (q: any) => q.eq("contentKey", args.contentKey))
            .unique();
        if (existing) {
            console.log("[contentLabeling] existing", { contentKey: args.contentKey, id: existing._id, stage: existing.stage });
            return {
                contentLabelId: existing._id,
                contentKey: args.contentKey,
                stage: existing.stage as any,
                existed: true,
            };
        }
        const now = Date.now();
        const contentLabelId = await ctx.db.insert("contentLabel", {
            contentKey: args.contentKey,
            stage: "queued",
            contentSource: args.contentSource as any,
            contentUrl: args.contentUrl,
            attempts: 0,
            createdAt: now,
            updatedAt: now,
        } as any);
        console.log("[contentLabeling] enqueued", { contentKey: args.contentKey, contentLabelId });
        return {
            contentLabelId,
            contentKey: args.contentKey,
            stage: "queued" as const,
            existed: false,
        };
    },
});

// Base: mark processing
export const markProcessing = internalMutation({
    args: v.object({ contentLabelId: v.id("contentLabel") }),
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.patch(args.contentLabelId, { stage: "processing", updatedAt: Date.now() } as any);
        return null;
    },
});

// Base: complete with patch
export const completeWithPatch = internalMutation({
    args: v.object({
        contentLabelId: v.id("contentLabel"),
        patch: v.object({
            // Normalized metadata (from source APIs)
            contentMediaType: v.optional(mediaTypeValidator), // "audio" | "video" | "text"
            title: v.optional(v.string()),
            authorName: v.optional(v.string()),
            authorUrl: v.optional(v.string()),
            description: v.optional(v.string()),
            thumbnailUrl: v.optional(v.string()),
            fullDurationInSeconds: v.optional(v.number()),
            	
            // Language signals
            contentLanguageCode: v.optional(languageCodeValidator), // primary spoken language
            captionLanguageCodes: v.optional(v.array(languageCodeValidator)), // available captions
            languageEvidence: v.optional(v.array(v.string())), // e.g. ["yt:defaultAudioLanguage", "transcript:fastText"]

            // LLM evaluation (structured + short text)
            targetLanguageEvaluation: v.optional(v.string()), // short summary (rename from targetLanguageLearnigEvaluation)
            targetLanguageEvaluationBullets: v.optional(v.array(v.string())), // brief bullet points (rename)
            // This is the from language code, its often not set, but it could be if the material is targeted something like english speakers learning x language
            contentFromLanguageCode: v.optional(languageCodeValidator),
            eval: v.optional(v.object({
                version: v.string(),             // schema/versioning
                cefr: v.optional(v.string()),    // e.g., "A2-B1"
                speechRateWpm: v.optional(v.number()),
                clarity: v.optional(v.number()), // 1..5
                domainTags: v.optional(v.array(v.string())), // ["news", "daily life"]
                useCases: v.optional(v.array(v.string())),   // ["listening practice", "shadowing"]
                hasDirectSubs: v.optional(v.boolean()),
                codeSwitching: v.optional(v.number()), // 0..1
                recommendedLearnerLevels: v.optional(v.array(v.string())), // ["A2","B1"]
            })),
        
        }),
    }),
    returns: v.null(),
    handler: async (ctx, args) => {
        const now = Date.now();
        await ctx.db.patch(args.contentLabelId, { ...args.patch, stage: "completed", processedAt: now, updatedAt: now });
        return null;
    },
});

// Base: mark failed
export const markFailed = internalMutation({
    args: v.object({ contentLabelId: v.id("contentLabel"), error: v.string() }),
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.patch(args.contentLabelId, { stage: "failed", lastError: args.error, updatedAt: Date.now() } as any);
        return null;
    },
});

// Base: read minimal label details (usable from actions)
export const getLabelBasics = internalQuery({
    args: v.object({ contentLabelId: v.id("contentLabel") }),
    returns: v.object({
        _id: v.id("contentLabel"),
        contentKey: v.optional(v.string()),
        contentUrl: v.optional(v.string()),
    }),
    handler: async (ctx, args) => {
        const doc = await ctx.db.get(args.contentLabelId);
        if (!doc) throw new Error("contentLabel not found");
        return {
            _id: doc._id,
            contentKey: (doc as any).contentKey,
            contentUrl: (doc as any).contentUrl,
        } as any;
    },
});


