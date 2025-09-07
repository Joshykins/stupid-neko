// Content Activities are the heartbeats, starts, pauses, ends, etc of any automated injestion of content

import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const addContentActivity = internalMutation({
    args: {
        userId: v.id("users"),
        contentKey: v.string(),
        activityType: v.union(v.literal("heartbeat"), v.literal("start"), v.literal("pause"), v.literal("end")),
        occurredAt: v.optional(v.number()),
    },
    returns: v.object({
        contentActivityId: v.optional(v.id("contentActivities")),
    }),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthorized");
        
        const label = await ctx.db.query("contentLabel").withIndex("by_content_key", (q: any) => q.eq("contentKey", args.contentKey)).unique();

        const user = await ctx.db.get(userId);
        if(!user) throw new Error("User not found");
        const currentTargetLanguageId = user.currentTargetLanguageId as Id<"userTargetLanguages"> | undefined;
        if(!currentTargetLanguageId) throw new Error("Current target language not found");
        if (label) {
            const currentTargetLanguage = await ctx.db.get(currentTargetLanguageId);
            if (currentTargetLanguage && currentTargetLanguage.languageCode !== label.contentLanguageCode) {
                // We don't want to add activities to labels that are not in the user's target language
                return { contentActivityId: undefined };
            }
        }

        const contentActivityId = await ctx.db.insert("contentActivities", {
            userId: args.userId,
            contentKey: args.contentKey,
            activityType: args.activityType,
            occurredAt: args.occurredAt,
        });
        return { contentActivityId };
    },
});