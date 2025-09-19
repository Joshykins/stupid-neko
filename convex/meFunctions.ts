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
            streakDisplayMode: v.optional(v.union(v.literal("grid"), v.literal("week"))),
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
            streakDisplayMode: (user as any).streakDisplayMode ?? undefined,
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

export const updateStreakDisplayMode = mutation({
    args: {
        mode: v.union(v.literal("grid"), v.literal("week")),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthorized");
        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");

        await ctx.db.patch(userId, { streakDisplayMode: args.mode } as any);
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
            totalMsLearning: v.optional(v.number()),
            userCreatedAt: v.number(),
            targetLanguageCreatedAt: v.number(),
            currentLevel: v.number(),
            nextLevelXp: v.number(),
            experienceTowardsNextLevel: v.number(),
            hasPreReleaseCode: v.boolean(),
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

        // Determine if the user has a pre-release code (or was manually granted)
        const code = await ctx.db
            .query("preReleaseCodes")
            .withIndex("by_user", (q: any) => q.eq("usedBy", userId))
            .take(1);
        const hasPreReleaseCode = Boolean((user as any)?.preReleaseGranted) || code.length > 0;

        // Read total XP from latest ledger event
        const latest = (await ctx.db
            .query("userTargetLanguageExperienceLedger")
            .withIndex("by_user_target_language", (q: any) => q.eq("userTargetLanguageId", currentTargetLanguageId))
            .order("desc")
            .take(1))[0] as any | undefined;

        const totalExperience = (latest?.runningTotalAfter as number | undefined) ?? 0;

        // Prefer values from the ledger snapshot; fall back to calculator for older events
        const currentLevel = (latest?.newLevel as number | undefined) ?? levelFromXp(totalExperience).level;
        const experienceTowardsNextLevel = (latest?.remainderTowardsNextLevel as number | undefined) ?? levelFromXp(totalExperience).remainder;
        const nextLevelXp = (latest?.nextLevelCost as number | undefined) ?? xpForNextLevel(currentLevel);

        return {
            name: user.name ?? undefined,
            image: user.image ?? undefined,
            currentStreak: user.currentStreak ?? undefined,
            longestStreak: user.longestStreak ?? undefined,
            languageCode: targetLanguage.languageCode ?? undefined,
            totalMsLearning: (targetLanguage as any).totalMsLearning ?? 0,
            userCreatedAt: user._creationTime,
            targetLanguageCreatedAt: targetLanguage._creationTime,
            currentLevel,
            experienceTowardsNextLevel,
            nextLevelXp,
            hasPreReleaseCode,
        };
    },
});


