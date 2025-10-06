import { v } from 'convex/values';
import {
    mutation,
    query,
} from '../_generated/server';
import {
    getUserByIntegrationKey,
    markIntegrationKeyAsUsed,
} from '../integrationKeyFunctions';

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

