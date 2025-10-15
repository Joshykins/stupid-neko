// Website provider-specific Convex functions can live here.
// (Currently no website-specific endpoints; core endpoints are in browserExtensionCoreFunctions.ts)


import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { mutation, query } from '../_generated/server';
import { getUserByIntegrationKey } from '../integrationKeyFunctions';
import { recordContentActivity } from '../labelingEngine/contentActivityFunctions';
import { getContentLabelByContentKey } from '../labelingEngine/contentLabelFunctions';
import { getCurrentTargetLanguage } from '../userFunctions';

// Record website content activity (only heartbeats) with fixed source = 'website'
export const recordWebsiteContentActivity = mutation({
    args: {
        integrationId: v.string(),
        activityType: v.literal('heartbeat'),
        contentKey: v.string(),
        url: v.optional(v.string()),
        occurredAt: v.optional(v.number()),
    },
    returns: v.object({
        ok: v.boolean(),
        saved: v.boolean(),
        languageActivityId: v.optional(v.id('userTargetLanguageActivities')),
        contentLabelId: v.optional(v.id('contentLabels')),
        isWaitingOnLabeling: v.optional(v.boolean()),
        reason: v.optional(v.string()),
        contentKey: v.optional(v.string()),
        contentLabel: v.optional(v.any()),
        currentTargetLanguage: v.optional(
            v.union(
                v.object({ languageCode: v.optional(v.string()) }),
                v.null()
            )
        ),
    }),
    handler: async (ctx, args): Promise<{
        ok: boolean;
        saved: boolean;
        languageActivityId?: Id<'userTargetLanguageActivities'>;
        contentLabelId?: Id<'contentLabels'>;
        isWaitingOnLabeling?: boolean;
        reason?: string;
        contentKey?: string;
        contentLabel?: unknown;
        currentTargetLanguage?: { languageCode?: string; } | null;
    }> => {
        const { integrationId, ...rest } = args;
        const user = await getUserByIntegrationKey({ ctx, args: { integrationId } });
        const userId = user._id;
        const result = await recordContentActivity({ ctx, args: { userId, source: 'website', ...rest } });

        let contentLabel = null;
        if (result?.contentKey) {
            contentLabel = await getContentLabelByContentKey({ ctx, args: { contentKey: result.contentKey } });
        }

        const currentTargetLanguage = await getCurrentTargetLanguage({ ctx, args: { userId } });
        return { ...result, contentLabel, currentTargetLanguage };
    },
});

// Mark a website as always track (policyKind = 'allow')
export const markWebsiteAsAlwaysTrack = mutation({
    args: {
        integrationId: v.string(),
        contentKey: v.string(),
        url: v.optional(v.string()),
        label: v.optional(v.string()),
        note: v.optional(v.string()),
    },
    returns: v.object({ ok: v.boolean(), created: v.boolean() }),
    handler: async (ctx, args) => {
        const user = await getUserByIntegrationKey({ ctx, args: { integrationId: args.integrationId } });
        const userId = user._id;

        const existing = await ctx.db
            .query('userContentLabelPolicies')
            .withIndex('by_user_and_content_key', q => q.eq('userId', userId).eq('contentKey', args.contentKey))
            .unique();
        if (existing) return { ok: true, created: false };

        await ctx.db.insert('userContentLabelPolicies', {
            userId,
            policyKind: 'allow',
            contentKey: args.contentKey,
            contentSource: 'website',
            contentUrl: args.url,
            label: args.label,
            note: args.note,
        });
        return { ok: true, created: true };
    },
});

// Check if website is always to be tracked (allow policy exists)
export const checkIfWebsiteIsAlwaysToBeTracked = query({
    args: { integrationId: v.string(), contentKey: v.string() },
    returns: v.object({ allowed: v.boolean() }),
    handler: async (ctx, args) => {
        const user = await getUserByIntegrationKey({ ctx, args: { integrationId: args.integrationId } });
        const existing = await ctx.db
            .query('userContentLabelPolicies')
            .withIndex('by_user_and_content_key', q => q.eq('userId', user._id).eq('contentKey', args.contentKey))
            .unique();
        return { allowed: existing?.policyKind === 'allow' };
    },
});
