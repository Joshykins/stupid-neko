import { v } from 'convex/values';
import {
    mutation,
    query,
} from '../_generated/server';
import {
    getUserByIntegrationKey,
    markIntegrationKeyAsUsed,
} from '../integrationKeyFunctions';
import {
    levelFromXp,
    xpForNextLevel,
} from '../../lib/levelAndExperienceCalculations/levelAndExperienceCalculator';
import type { Id } from '../_generated/dataModel';

export const meFromIntegration = query({
    args: { integrationId: v.string() },
    returns: v.union(
        v.object({
            name: v.optional(v.string()),
            email: v.optional(v.string()),
            image: v.optional(v.string()),
            timezone: v.optional(v.string()),
            languageCode: v.optional(v.string()),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        const user = await getUserByIntegrationKey({
            ctx,
            args: { integrationId: args.integrationId },
        });
        if (!user) return null;
        const currentTargetLanguageId = user.currentTargetLanguageId;
        if (!currentTargetLanguageId)
            throw new Error('Current target language not found');
        const tl = await ctx.db.get(currentTargetLanguageId);
        return {
            name: user.name ?? undefined,
            email: user.email ?? undefined,
            image: user.image ?? undefined,
            timezone: user.timezone ?? undefined,
            languageCode: tl?.languageCode ?? undefined,
        };
    },
});

export const markIntegrationKeyAsUsedFromExtension = mutation({
    args: { integrationId: v.string() },
    handler: async (ctx, args): Promise<null> => {
        await markIntegrationKeyAsUsed({
            ctx,
            args: { integrationId: args.integrationId },
        });

        return null;
    },
});

export const getUserProgressFromIntegration = query({
    args: { integrationId: v.string() },
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
        v.null()
    ),
    handler: async (ctx, args) => {
        const user = await getUserByIntegrationKey({
            ctx,
            args: { integrationId: args.integrationId },
        });
        if (!user) return null;

        const currentTargetLanguageId = user.currentTargetLanguageId as
            | Id<'userTargetLanguages'>
            | undefined;
        if (!currentTargetLanguageId)
            throw new Error('Current target language not found');
        const targetLanguage = await ctx.db.get(currentTargetLanguageId);
        if (!targetLanguage) return null;

        // Determine if the user has a pre-release code (or was manually granted)
        const code = await ctx.db
            .query('preReleaseCodes')
            .withIndex('by_user', q => q.eq('usedByUserId', user._id))
            .take(1);
        const hasPreReleaseCode =
            Boolean((user as any)?.preReleaseGranted) || code.length > 0;

        // Read total XP from latest ledger event
        const latest = (
            await ctx.db
                .query('userTargetLanguageExperienceLedgers')
                .withIndex('by_user_target_language', q =>
                    q.eq('userTargetLanguageId', currentTargetLanguageId)
                )
                .order('desc')
                .take(1)
        )[0];

        const totalExperience = latest?.runningTotalAfter ?? 0;

        // Prefer values from the ledger snapshot; fall back to calculator for older events
        const currentLevel = latest?.newLevel ?? levelFromXp(totalExperience).level;
        const experienceTowardsNextLevel =
            latest?.remainderTowardsNextLevel ??
            levelFromXp(totalExperience).remainder;
        const nextLevelXp = latest?.nextLevelCost ?? xpForNextLevel(currentLevel);

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

