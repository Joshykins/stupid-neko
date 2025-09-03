import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { languageCodeValidator, type LanguageCode } from "./schema";
import { UserIdentity } from "convex/server";


export const me = query({
    args: {},
    returns: v.union(
        v.object({
            name: v.optional(v.string()),
            email: v.optional(v.string()),
            image: v.optional(v.string()),
            username: v.optional(v.string()),
            timezone: v.optional(v.string()),
            languageCode: v.optional(v.string()),
        }),
        v.null(),
    ),
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;
        const user = await ctx.db.get(userId);
        if (!user) return null;

        // Get current language, sort by last updated
        const userTargetLanguage = await ctx.db.query("userTargetLanguages").withIndex("by_user", (q: any) => q.eq("userId", userId)).order("desc").take(1);
        const languageCode = userTargetLanguage[0].languageCode;
        if (!userTargetLanguage) return null;
        return {
            name: (user as any).name ?? undefined,
            email: (user as any).email ?? undefined,
            image: (user as any).image ?? undefined,
            timezone: (user as any).timezone ?? undefined,
            languageCode: languageCode ?? undefined,
        };
    },
});


export const updateMe = mutation({
    args: {
        name: v.optional(v.string()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthorized");
        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");

        await ctx.db.patch(userId, {
            ...(args.name !== undefined ? { name: args.name || undefined } : {}),
        } as any);
        return null;
    },
});

export const updateTimezone = mutation({
    args: {
        timezone: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthorized");
        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");

        await ctx.db.patch(userId, {
            timezone: args.timezone,
        } as any);
        return null;
    },
});


