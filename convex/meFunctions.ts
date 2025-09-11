import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { levelFromXp, xpForNextLevel } from "../lib/levelAndExperienceCalculations/levelAndExperienceCalculator";
import type { LanguageCode } from "./schema";


export type MeInfo = {
    name?: string;
    email?: string;
    image?: string;
    timezone?: string;
    languageCode?: LanguageCode;
};

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

        // Resolve current target language from the user record
        const currentTargetLanguageId = user.currentTargetLanguageId as Id<"userTargetLanguages"> | undefined;
        if (!currentTargetLanguageId) {
            throw new Error("Current target language not found");
        }
        const utl = await ctx.db.get(currentTargetLanguageId);
        const languageCode = utl?.languageCode;
        return {
            name: user.name ?? undefined,
            email: user.email ?? undefined,
            image: user.image ?? undefined,
            timezone: user.timezone ?? undefined,
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
            currentLevel: v.number(),
            nextLevelXp: v.number(),
            experienceTowardsNextLevel: v.number(),
        }),
        v.null(),
    ),
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return null;
        
        const user = await ctx.db.get(userId);
        if (!user) return null;

        // Resolve current target language from the user record
        const currentTargetLanguageId = user.currentTargetLanguageId as Id<"userTargetLanguages"> | undefined;
        if (!currentTargetLanguageId) throw new Error("Current target language not found");
        const targetLanguage = await ctx.db.get(currentTargetLanguageId);
        if (!targetLanguage) return null;
        const totalExperience = targetLanguage.totalExperience ?? 0
        
        
        // Simple level calculation (can be refined later)
        // For now, use a basic formula: level = sqrt(totalExperience / 100) + 1

        const { level: currentLevel, remainder: remainderXp } = levelFromXp(totalExperience);
        const nextLevelXp = xpForNextLevel(currentLevel);
        const experienceTowardsNextLevel = nextLevelXp - remainderXp;

        return {
            name: user.name ?? undefined,
            image: user.image ?? undefined,
            currentStreak: user.currentStreak ?? undefined,
            longestStreak: user.longestStreak ?? undefined,
            languageCode: targetLanguage.languageCode ?? undefined,
            totalMinutesLearning: targetLanguage.totalMinutesLearning ?? 0,
            currentLevel,
            experienceTowardsNextLevel,
            nextLevelXp,
        };
    },
});


