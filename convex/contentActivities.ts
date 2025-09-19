// Content Activities are the heartbeats, starts, pauses, ends, etc of any automated injestion of content

import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { contentSourceValidator } from "./schema";
import { getEffectiveNow, dangerousTestingEnabled } from "./utils";


export const recordContentActivity = internalMutation({
    args: {
        userId: v.id("users"),
        source: contentSourceValidator,
        activityType: v.union(v.literal("heartbeat"), v.literal("start"), v.literal("pause"), v.literal("end")),
        // Required: provide a contentKey like "youtube:VIDEO_ID"
        contentKey: v.string(),
        // Optional: pass the canonical content URL for labeling metadata
        url: v.optional(v.string()),
        occurredAt: v.optional(v.number()),
    },
    returns: v.object({
        ok: v.boolean(),
        saved: v.boolean(),
        contentActivityId: v.optional(v.id("contentActivities")),
        contentLabelId: v.optional(v.id("contentLabel")),
        isWaitingOnLabeling: v.optional(v.boolean()),
        reason: v.optional(v.string()),
        contentKey: v.optional(v.string()),
    }),
    handler: async (ctx, args): Promise<{
        ok: true;
        saved: boolean;
        contentActivityId?: Id<"contentActivities">;
        contentLabelId?: Id<"contentLabel">;
        isWaitingOnLabeling?: boolean;
        reason?: string;
        contentKey?: string;
    } | { ok: true; saved: false; reason: string; contentKey?: string; contentLabelId?: Id<"contentLabel">; }> => {
        const userId = args.userId;

        // Load user and their current target language as required by the app
        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");
        const currentTargetLanguageId = user.currentTargetLanguageId as Id<"userTargetLanguages"> | undefined;
        if (!currentTargetLanguageId) throw new Error("Current target language not found");

        const contentKey = args.contentKey;

        const occurredAt = await getEffectiveNow(ctx);
        
        // Inspect existing content label
        const label = await ctx.db
            .query("contentLabel")
            .withIndex("by_content_key", (q: any) => q.eq("contentKey", contentKey as string))
            .unique();

        // If no label exists, enqueue and record the activity as waiting on labeling
        if (!label) {
            const contentActivityId = await ctx.db.insert("contentActivities", {
                userId,
                contentKey,
                activityType: args.activityType,
                occurredAt,
                isWaitingOnLabeling: true,
            });
            const enqueue: { contentLabelId: Id<"contentLabel">; contentKey: string; stage: "queued" | "processing" | "completed" | "failed"; existed: boolean } = await ctx.runMutation(internal.contentLabeling.getOrEnqueue, {
                contentKey,
                contentSource: args.source as any,
                contentUrl: args.url,
            });
            return {
                ok: true,
                saved: true,
                contentActivityId,
                contentLabelId: enqueue.contentLabelId,
                isWaitingOnLabeling: true,
                contentKey,
            } as const;
        }

        // If label exists but isn't completed or lacks language, record as waiting
        if (label.stage !== "completed" || !label.contentLanguageCode) {
            const contentActivityId = await ctx.db.insert("contentActivities", {
                userId,
                contentKey,
                activityType: args.activityType,
                occurredAt,
                isWaitingOnLabeling: true,
            });
            return {
                ok: true,
                saved: true,
                contentActivityId,
                contentLabelId: label._id,
                isWaitingOnLabeling: true,
                contentKey,
            } as const;
        }

        // Otherwise, filter by user's target language
        const currentTargetLanguage = await ctx.db.get(currentTargetLanguageId);
        if (!currentTargetLanguage) throw new Error("Current target language not found");
        if (currentTargetLanguage.languageCode !== label.contentLanguageCode) {
            return {
                ok: true,
                saved: false,
                reason: "not_target_language",
                contentLabelId: label._id,
                contentKey,
            } as const;
        }

        // Label matches target language, record activity normally
        const contentActivityId = await ctx.db.insert("contentActivities", {
            userId,
            contentKey,
            activityType: args.activityType,
            occurredAt,
            isWaitingOnLabeling: false,
        });
        return {
            ok: true,
            saved: true,
            contentActivityId,
            contentLabelId: label._id,
            isWaitingOnLabeling: false,
            contentKey,
        } as const;
    },
});