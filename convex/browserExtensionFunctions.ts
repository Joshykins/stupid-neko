import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id, Doc } from './_generated/dataModel';
import {
	mutation,
	query,
	type QueryCtx,
	type MutationCtx,
} from './_generated/server';
import { contentSourceValidator, languageCodeValidator } from './schema';
import {
	getUserByIntegrationKey,
	markIntegrationKeyAsUsed,
} from './integrationKeyFunctions';
import { recordContentActivity } from './labelingEngine/contentActivityFunctions';
import { getContentLabelByContentKey } from './labelingEngine/contentLabelFunctions';
import { getCurrentTargetLanguage } from './userFunctions';
import { getAuthUserId } from '@convex-dev/auth/server';

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

export const recordContentActivityFromIntegration = mutation({
	args: {
		integrationId: v.string(),
        // Allow 'web'site to flow through since we may record activities for generic sites
        source: v.union(contentSourceValidator),
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
		contentActivityId: v.optional(v.id('contentActivities')),
		contentLabelId: v.optional(v.id('contentLabels')),
		isWaitingOnLabeling: v.optional(v.boolean()),
		reason: v.optional(v.string()),
		contentKey: v.optional(v.string()),
		contentLabel: v.optional(v.any()),
		currentTargetLanguage: v.optional(
			v.union(
				v.object({ languageCode: v.optional(languageCodeValidator) }),
				v.null()
			)
		),
	}),
	handler: async (
		ctx,
		args
	): Promise<{
		ok: boolean;
		saved: boolean;
		contentActivityId?: Id<'contentActivities'>;
		contentLabelId?: Id<'contentLabels'>;
		isWaitingOnLabeling?: boolean;
		reason?: string;
		contentKey?: string;
		contentLabel?: unknown;
		currentTargetLanguage?: {
			languageCode?: import('./schema').LanguageCode;
		} | null;
	}> => {
		const { integrationId, ...rest } = args;
		const user = await getUserByIntegrationKey({
			ctx,
			args: { integrationId: args.integrationId },
		});
		const userId = user._id;
		const result = await recordContentActivity({
			ctx,
			args: { userId, ...rest },
		});
		let contentLabel = null;

		if (result?.contentKey) {
			contentLabel = await getContentLabelByContentKey({
				ctx,
				args: { contentKey: result.contentKey },
			});
		}

		let currentTargetLanguage = null;
		currentTargetLanguage = await getCurrentTargetLanguage({
			ctx,
			args: { userId },
		});
		return { ...result, contentLabel, currentTargetLanguage };
	},
});

export const createUserContentBlacklistFromIntegration = mutation({
    args: {
        integrationId: v.string(),
        contentKey: v.string(),
        // Allow web in addition to known sources
        source: v.union(contentSourceValidator),
        url: v.optional(v.string()),
        label: v.optional(v.string()),
        note: v.optional(v.string()),
    },
    returns: v.object({ ok: v.boolean(), created: v.boolean() }),
    handler: async (ctx, args) => {
        const user = await getUserByIntegrationKey({
            ctx,
            args: { integrationId: args.integrationId },
        });
        const userId = user._id;

        // Check existing
        const existing = await ctx.db
            .query('userContentBlacklists')
            .withIndex('by_user_and_content_key', q =>
                q.eq('userId', userId).eq('contentKey', args.contentKey)
            )
            .unique();
        if (existing) return { ok: true, created: false };

        await ctx.db.insert('userContentBlacklists', {
            userId,
            contentKey: args.contentKey,
            contentSource: args.source,
            contentUrl: args.url,
            label: args.label,
            note: args.note,
        });
        return { ok: true, created: true };
    },
});

export const listUserContentBlacklists = query({
    args: {
        search: v.optional(v.string()),
        source: v.optional(v.union(contentSourceValidator)),
        sort: v.optional(v.union(v.literal('newest'), v.literal('oldest'))),
        cursor: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    returns: v.object({
        items: v.array(
            v.object({
                _id: v.id('userContentBlacklists'),
                _creationTime: v.number(),
                contentKey: v.string(),
                contentSource: v.union(contentSourceValidator),
                contentUrl: v.optional(v.string()),
                label: v.optional(v.string()),
                note: v.optional(v.string()),
            })
        ),
        continueCursor: v.optional(v.string()),
        isDone: v.boolean(),
    }),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error('Unauthorized');

        const limit = Math.max(1, Math.min(100, args.limit ?? 20));

        // Start from by_user index
        let q = ctx.db.query('userContentBlacklists').withIndex('by_user', q => q.eq('userId', userId));

        // Filter by source if provided
        if (args.source) {
            q = ctx.db
                .query('userContentBlacklists')
                .withIndex('by_user_and_source', q =>
                    q
                        .eq('userId', userId)
                        .eq(
                            'contentSource',
                            args.source as 'manual' | 'youtube' | 'spotify' | 'anki' | 'website'
                        )
                );
        }

        // Sorting by creation time
        const order = args.sort === 'oldest' ? 'asc' : 'desc';
        const page = await q.order(order).paginate({ cursor: args.cursor ?? null, numItems: limit });

        // In-memory search filter (contentKey, label, url)
        const term = (args.search ?? '').trim().toLowerCase();
        const filtered = term
            ? page.page.filter(it =>
                it.contentKey.toLowerCase().includes(term) ||
                (it.label ?? '').toLowerCase().includes(term) ||
                (it.contentUrl ?? '').toLowerCase().includes(term)
            )
            : page.page;

        // Project only fields declared in returns validator
        const items = filtered.map(it => ({
            _id: it._id,
            _creationTime: it._creationTime,
            contentKey: it.contentKey,
            contentSource: it.contentSource as typeof it.contentSource,
            contentUrl: it.contentUrl,
            label: it.label,
            note: it.note,
        }));

        return {
            items,
            continueCursor: page.continueCursor ?? undefined,
            isDone: page.isDone,
        };
    },
});

export const deleteUserContentBlacklist = mutation({
    args: { id: v.id('userContentBlacklists') },
    returns: v.null(),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error('Unauthorized');
        const row = await ctx.db.get(args.id);
        if (!row || row.userId !== userId) throw new Error('Not found');
        await ctx.db.delete(args.id);
        return null;
    },
});


