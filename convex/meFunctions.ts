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
        
        // Check if user has any target languages
        if (!userTargetLanguage || userTargetLanguage.length === 0) {
            return {
                name: (user as any).name ?? undefined,
                email: (user as any).email ?? undefined,
                image: (user as any).image ?? undefined,
                timezone: (user as any).timezone ?? undefined,
                languageCode: undefined,
            };
        }
        
        const languageCode = userTargetLanguage[0].languageCode;
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

export const getUserProgress = query({
    args: {},
    returns: v.union(
        v.object({
            name: v.optional(v.string()),
            image: v.optional(v.string()),
            currentStreak: v.optional(v.number()),
            longestStreak: v.optional(v.number()),
            languageCode: v.optional(v.string()),
            totalMinutesLearning: v.optional(v.number()),
            totalExperience: v.optional(v.number()),
            currentLevel: v.number(),
            nextLevelXp: v.number(),
            remainderXp: v.number(),
        }),
        v.null(),
    ),
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;
        
        const user = await ctx.db.get(userId);
        if (!user) return null;

        // Get current language, sort by last updated
        const userTargetLanguage = await ctx.db.query("userTargetLanguages")
            .withIndex("by_user", (q: any) => q.eq("userId", userId))
            .order("desc")
            .take(1);
        
        if (!userTargetLanguage || userTargetLanguage.length === 0) return null;
        
        const targetLanguage = userTargetLanguage[0];
        const totalExperience = targetLanguage.totalExperience ?? 0;
        
        // Simple level calculation (can be refined later)
        // For now, use a basic formula: level = sqrt(totalExperience / 100) + 1
        const currentLevel = Math.max(1, Math.floor(Math.sqrt(totalExperience / 100)) + 1);
        
        // Simple XP calculation for next level
        const nextLevelXp = Math.pow(currentLevel, 2) * 100;
        const remainderXp = totalExperience % nextLevelXp;

        return {
            name: (user as any).name ?? undefined,
            image: (user as any).image ?? undefined,
            currentStreak: (user as any).currentStreak ?? undefined,
            longestStreak: (user as any).longestStreak ?? undefined,
            languageCode: targetLanguage.languageCode ?? undefined,
            totalMinutesLearning: targetLanguage.totalMinutesLearning ?? 0,
            totalExperience,
            currentLevel,
            nextLevelXp,
            remainderXp,
        };
    },
});


