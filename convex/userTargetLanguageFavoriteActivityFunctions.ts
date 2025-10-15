import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { LanguageCode } from './schema';
import { mutation, query } from './_generated/server';
import { getEffectiveNow } from './utils';
import { paginationOptsValidator } from 'convex/server';

export const createFavorite = mutation({
	args: {
		title: v.string(),
		description: v.optional(v.string()),
		externalUrl: v.optional(v.string()),
		defaultDurationInMs: v.optional(v.number()),
	},
	returns: v.object({
		favoriteId: v.id('userTargetLanguageFavoriteActivities'),
	}),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error('Unauthorized');
		const user = await ctx.db.get(userId);
		const utlId = user?.currentTargetLanguageId as
			| Id<'userTargetLanguages'>
			| undefined;
		if (!utlId) throw new Error('No active target language selected');

		const favoriteId = await ctx.db.insert(
			'userTargetLanguageFavoriteActivities',
			{
				userId,
				userTargetLanguageId: utlId,
				title: args.title,
				description: args.description ?? undefined,
				externalUrl: args.externalUrl ?? undefined,
				// store canonical ms
				defaultDurationInMs: Math.max(
					0,
					Math.round(args.defaultDurationInMs ?? 10 * 60 * 1000)
				),
				createdFromLanguageActivityId: undefined,
				usageCount: 0,
				lastUsedAt: undefined,
			}
		);
		return { favoriteId };
	},
});

export const listFavorites = query({
	args: {},
	returns: v.array(
		v.object({
			_id: v.id('userTargetLanguageFavoriteActivities'),
			_creationTime: v.number(),
			userId: v.id('users'),
			userTargetLanguageId: v.id('userTargetLanguages'),
			title: v.string(),
			description: v.optional(v.string()),
			externalUrl: v.optional(v.string()),
			defaultDurationInMs: v.optional(v.number()),
			createdFromLanguageActivityId: v.optional(
				v.id('userTargetLanguageActivities')
			),
			usageCount: v.optional(v.number()),
			lastUsedAt: v.optional(v.number()),
		})
	),
	handler: async ctx => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return [];
		const user = await ctx.db.get(userId);
		const utlId = user?.currentTargetLanguageId as
			| Id<'userTargetLanguages'>
			| undefined;
		if (!utlId) return [];
		const favorites = await ctx.db
			.query('userTargetLanguageFavoriteActivities')
			.withIndex('by_user_target_language', q =>
				q.eq('userTargetLanguageId', utlId)
			)
			.order('desc')
			.collect();
		// map ms -> minutes for client compatibility and strip non-validated fields
		const mapped = favorites.map(f => ({
			_id: f._id,
			_creationTime: f._creationTime,
			userId: f.userId,
			userTargetLanguageId: f.userTargetLanguageId,
			title: f.title,
			description: f.description,
			externalUrl: f.externalUrl,
			createdFromLanguageActivityId: f.createdFromLanguageActivityId,
			usageCount: f.usageCount,
			lastUsedAt: f.lastUsedAt,
			defaultDurationInMs: f.defaultDurationInMs,
		}));
		return mapped as unknown as Array<{
			_id: Id<'userTargetLanguageFavoriteActivities'>;
			_creationTime: number;
			userId: Id<'users'>;
			userTargetLanguageId: Id<'userTargetLanguages'>;
			title: string;
			description?: string | undefined;
			externalUrl?: string | undefined;
			defaultDurationInMs?: number | undefined;
			createdFromLanguageActivityId?:
			| Id<'userTargetLanguageActivities'>
			| undefined;
			usageCount?: number | undefined;
			lastUsedAt?: number | undefined;
		}>;
	},
});

export const listFavoritesPaginated = query({
	args: { paginationOpts: paginationOptsValidator },
	returns: v.object({
		page: v.array(
			v.object({
				_id: v.id('userTargetLanguageFavoriteActivities'),
				_creationTime: v.number(),
				userId: v.id('users'),
				userTargetLanguageId: v.id('userTargetLanguages'),
				title: v.string(),
				description: v.optional(v.string()),
				externalUrl: v.optional(v.string()),
				defaultDurationInMs: v.optional(v.number()),
				createdFromLanguageActivityId: v.optional(
					v.id('userTargetLanguageActivities')
				),
				usageCount: v.optional(v.number()),
				lastUsedAt: v.optional(v.number()),
			})
		),
		isDone: v.boolean(),
		continueCursor: v.union(v.string(), v.null()),
	}),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) {
			return { page: [], isDone: true, continueCursor: null };
		}
		const user = await ctx.db.get(userId);
		const utlId = user?.currentTargetLanguageId as
			| Id<'userTargetLanguages'>
			| undefined;
		if (!utlId) {
			return { page: [], isDone: true, continueCursor: null };
		}

		const result = await ctx.db
			.query('userTargetLanguageFavoriteActivities')
			.withIndex('by_user_target_language', q =>
				q.eq('userTargetLanguageId', utlId)
			)
			.order('desc')
			.paginate(args.paginationOpts);

		// map ms -> minutes for client compatibility and strip non-validated fields
		const mapped = result.page.map(f => ({
			_id: f._id,
			_creationTime: f._creationTime,
			userId: f.userId,
			userTargetLanguageId: f.userTargetLanguageId,
			title: f.title,
			description: f.description,
			externalUrl: f.externalUrl,
			createdFromLanguageActivityId: f.createdFromLanguageActivityId,
			usageCount: f.usageCount,
			lastUsedAt: f.lastUsedAt,
			defaultDurationInMs: f.defaultDurationInMs,
		}));

		return {
			page: mapped as unknown as Array<{
				_id: Id<'userTargetLanguageFavoriteActivities'>;
				_creationTime: number;
				userId: Id<'users'>;
				userTargetLanguageId: Id<'userTargetLanguages'>;
				title: string;
				description?: string | undefined;
				externalUrl?: string | undefined;
				defaultDurationInMs?: number | undefined;
				createdFromLanguageActivityId?:
				| Id<'userTargetLanguageActivities'>
				| undefined;
				usageCount?: number | undefined;
				lastUsedAt?: number | undefined;
			}>,
			isDone: result.isDone,
			continueCursor: result.continueCursor,
		};
	},
});

export const listManualActivitiesWithFavoriteMatch = query({
	args: {
		limit: v.optional(v.number()),
		cursorOccurredAt: v.optional(v.number()),
	},
	returns: v.object({
		page: v.array(
			v.object({
				_id: v.id('userTargetLanguageActivities'),
				// We intentionally omit _creationTime and other fields to keep payload small
				title: v.optional(v.string()),
				description: v.optional(v.string()),
				externalUrl: v.optional(v.string()),
				durationInSeconds: v.optional(v.number()),
				occurredAt: v.optional(v.number()),
				userTargetLanguageId: v.id('userTargetLanguages'),
				source: v.union(
					v.literal('manual'),
					v.literal('browser-extension-youtube-provider'),
					v.literal('browser-extension-website-provider')
				),
				matchedFavoriteId: v.optional(
					v.id('userTargetLanguageFavoriteActivities')
				),
			})
		),
		isDone: v.boolean(),
		continueCursor: v.optional(v.number()),
	}),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return { page: [], isDone: true, continueCursor: undefined };
		const pageLimit = Math.max(1, Math.min(50, args.limit ?? 20));
		let cursor = args.cursorOccurredAt;
		type ManualActivityRow = {
			_id: Id<'userTargetLanguageActivities'>;
			title?: string;
			description?: string;
			externalUrl?: string;
			durationInSeconds?: number;
			occurredAt?: number;
			userTargetLanguageId: Id<'userTargetLanguages'>;
			source: 'manual' | 'browser-extension-youtube-provider' | 'browser-extension-website-provider';
			matchedFavoriteId?: Id<'userTargetLanguageFavoriteActivities'>;
		};
		const page: Array<ManualActivityRow> = [];
		const batchSize = Math.max(pageLimit, 25);

		// Get all existing favorites for this user and target language to check matches
		const user = await ctx.db.get(userId);
		const utlId = user?.currentTargetLanguageId as
			| Id<'userTargetLanguages'>
			| undefined;
		let existingFavorites: Array<Doc<'userTargetLanguageFavoriteActivities'>> =
			[];
		if (utlId) {
			existingFavorites = await ctx.db
				.query('userTargetLanguageFavoriteActivities')
				.withIndex('by_user_target_language', q =>
					q.eq('userTargetLanguageId', utlId)
				)
				.collect();
		}

		while (page.length < pageLimit) {
			const q = ctx.db
				.query('userTargetLanguageActivities')
				.withIndex('by_user', q => 
					typeof cursor === 'number'
						? q.eq('userId', userId).lt('_creationTime', cursor)
						: q.eq('userId', userId)
				)
				.order('desc');
			const batch = await q.take(batchSize);
			if (batch.length === 0) {
				break;
			}
			for (const it of batch) {
				const occurredAt =  it._creationTime;
				cursor = occurredAt;
				if (it.source !== 'manual') continue;

				// Check if this activity matches an existing favorite by title
				const title = (it.title ?? '').trim();
				const match = existingFavorites.find(
					f => (f.title ?? '').trim().toLowerCase() === title.toLowerCase()
				);
				const matchedFavoriteId = match?._id;

				page.push({
					_id: it._id,
					title: it.title ?? undefined,
					description: it.description ?? undefined,
					externalUrl: it.externalUrl ?? undefined,
					durationInSeconds: Math.max(
						0,
						Math.round(((it.durationInMs ?? 0) as number) / 1000)
					),
					occurredAt,
					userTargetLanguageId: it.userTargetLanguageId,
					source: it.source,
					matchedFavoriteId,
				});
				if (page.length >= pageLimit) break;
			}
			if (batch.length < batchSize) {
				break;
			}
		}
		const isDone = page.length < pageLimit;
		const continueCursor =
			page.length > 0 ? page[page.length - 1].occurredAt : undefined;
		return { page, isDone, continueCursor };
	},
});

export const addFavoriteFromActivity = mutation({
	args: {
		activityId: v.id('userTargetLanguageActivities'),
		isFavorite: v.boolean(),
	},
	returns: v.object({
		favoriteId: v.optional(v.id('userTargetLanguageFavoriteActivities')),
		isFavorite: v.boolean(),
	}),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error('Unauthorized');
		const act = await ctx.db.get(args.activityId);
		if (!act) throw new Error('Activity not found');
		if (act.userId !== userId) throw new Error('Forbidden');
		if (act.source !== 'manual')
			throw new Error('Only manual activities can be favorited');

		const utlId = act.userTargetLanguageId as Id<'userTargetLanguages'>;
		const title = (act.title ?? '').trim();
		if (!title) throw new Error('Activity missing title');

		// Look for existing favorite by title
		const existing = await ctx.db
			.query('userTargetLanguageFavoriteActivities')
			.withIndex('by_user_target_language', q =>
				q.eq('userTargetLanguageId', utlId)
			)
			.collect();
		const match = existing.find(
			f => (f.title ?? '').trim().toLowerCase() === title.toLowerCase()
		);

		if (args.isFavorite) {
			const favoriteId =
				(match?._id as
					| Id<'userTargetLanguageFavoriteActivities'>
					| undefined) ??
				(await ctx.db.insert('userTargetLanguageFavoriteActivities', {
					userId,
					userTargetLanguageId: utlId,
					title: act.title ?? '',
					description: act.description ?? undefined,
					externalUrl: act.externalUrl ?? undefined,
					// store canonical ms
					defaultDurationInMs: Math.max(
						0,
						Math.round((act.durationInMs ?? 0) as number)
					),
					createdFromLanguageActivityId: act._id,
					usageCount: 0,
					lastUsedAt: undefined,
				}));
			return { favoriteId, isFavorite: true };
		} else {
			// Optional: Do not delete the favorite document automatically to avoid surprising removals across other activities.
			return { favoriteId: undefined, isFavorite: false };
		}
	},
});

export const updateFavorite = mutation({
	args: {
		favoriteId: v.id('userTargetLanguageFavoriteActivities'),
		title: v.optional(v.string()),
		description: v.optional(v.string()),
		externalUrl: v.optional(v.string()),
		defaultDurationInMs: v.optional(v.number()),
	},
	returns: v.object({ updated: v.boolean() }),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error('Unauthorized');
		const fav = await ctx.db.get(args.favoriteId);
		if (!fav) throw new Error('Favorite not found');
		if (fav.userId !== userId) throw new Error('Forbidden');

		const patch: Partial<
			Pick<
				Doc<'userTargetLanguageFavoriteActivities'>,
				'title' | 'description' | 'externalUrl' | 'defaultDurationInMs'
			>
		> = {};
		if (typeof args.title !== 'undefined') patch.title = args.title;
		if (typeof args.description !== 'undefined')
			patch.description = args.description;
		if (typeof args.externalUrl !== 'undefined')
			patch.externalUrl = args.externalUrl;
		if (typeof args.defaultDurationInMs !== 'undefined')
			patch.defaultDurationInMs = Math.max(
				0,
				Math.round(args.defaultDurationInMs)
			);

		await ctx.db.patch(args.favoriteId, patch);
		return { updated: true };
	},
});

export const deleteFavorite = mutation({
	args: { favoriteId: v.id('userTargetLanguageFavoriteActivities') },
	returns: v.object({ deleted: v.boolean() }),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error('Unauthorized');
		const fav = await ctx.db.get(args.favoriteId);
		if (!fav) return { deleted: false };
		if (fav.userId !== userId) throw new Error('Forbidden');
		await ctx.db.delete(args.favoriteId);
		return { deleted: true };
	},
});
