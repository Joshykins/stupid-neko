// YouTube provider-specific Convex functions can live here.
// (Currently no youtube-specific endpoints; core endpoints are in browserExtensionCoreFunctions.ts)


import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { mutation, query } from '../_generated/server';
import { getUserByIntegrationKey } from '../integrationKeyFunctions';
import { recordContentActivity } from '../labelingEngine/contentActivityFunctions';
import { getContentLabelByContentKey } from '../labelingEngine/contentLabelFunctions';
import { getCurrentTargetLanguage } from '../userFunctions';

// Record YouTube content activity (fixed source = 'youtube')
export const recordYoutubeContentActivity = mutation({
    args: {
        integrationId: v.string(),
        activityType: v.union(
            v.literal('heartbeat'),
            v.literal('start'),
            v.literal('pause'),
            v.literal('end')
        ),
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
        const result = await recordContentActivity({ ctx, args: { userId, source: 'youtube', ...rest } });

        let contentLabel = null;
        if (result?.contentKey) {
            contentLabel = await getContentLabelByContentKey({ ctx, args: { contentKey: result.contentKey } });
        }

        const currentTargetLanguage = await getCurrentTargetLanguage({ ctx, args: { userId } });
        return { ...result, contentLabel, currentTargetLanguage };
    },
});

// Mark a YouTube video as blocked (policyKind = 'block')
export const markYoutubeVideoAsBlocked = mutation({
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
            policyKind: 'block',
            contentKey: args.contentKey,
            contentSource: 'youtube',
            contentUrl: args.url,
            label: args.label,
            note: args.note,
        });
        return { ok: true, created: true };
    },
});


// Check if YouTube video is blocked (block policy exists)
export const checkIfYoutubeVideoIsBlocked = query({
    args: { integrationId: v.string(), contentKey: v.string() },
    returns: v.object({ blocked: v.boolean() }),
    handler: async (ctx, args) => {
        const user = await getUserByIntegrationKey({ ctx, args: { integrationId: args.integrationId } });
        const existing = await ctx.db
            .query('userContentLabelPolicies')
            .withIndex('by_user_and_content_key', q => q.eq('userId', user._id).eq('contentKey', args.contentKey))
            .unique();
        return { blocked: existing?.policyKind === 'block' };
    },
});
