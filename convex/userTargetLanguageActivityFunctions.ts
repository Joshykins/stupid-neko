import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query, internalMutation, internalQuery } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import { type LanguageCode, languageCodeValidator } from './schema';
import { getEffectiveNow } from './utils';
import { addExperience, getExperienceForActivity } from './userTargetLanguageExperienceFunctions';
import { updateStreakOnActivity } from './userStreakFunctions';

// Gap threshold for creating new activities vs updating existing ones
const ACTIVITY_GAP_MS = 2 * 60 * 1000; // 2 minutes

// Minimum duration threshold for meaningful activities
const MIN_ACTIVITY_DURATION_MS = 30 * 1000; // 30 seconds

// Create activity, update streak, then add experience (internal)
export const addLanguageActivity = async ({
	ctx,
	args,
}: {
	ctx: MutationCtx;
	args: {
		userId?: Id<'users'>;
		title: string;
		description?: string;
		durationInMs: number;
		occurredAt?: number;
		languageCode: LanguageCode;
		contentKey?: string;
		externalUrl?: string;
		contentCategories?: ('audio' | 'video' | 'text' | 'other')[];
		source: 'manual' | 'browser-extension-youtube-provider' | 'browser-extension-website-provider';
		userTargetLanguageId: Id<'userTargetLanguages'>;
	};
}): Promise<{
	activityId: Id<'userTargetLanguageActivities'>;
	currentStreak: number;
	longestStreak: number;
	experience: {
		userTargetLanguageId: Id<'userTargetLanguages'>;
		previousTotalExperience: number;
		newTotalExperience: number;
		previousLevel: number;
		newLevel: number;
		levelsGained: number;
	};
}> => {
	const userId = args.userId ?? (await getAuthUserId(ctx));
	if (!userId) throw new Error('Unauthorized');

	// 1) Create the language activity
	const nowEffective = await getEffectiveNow(ctx);
	const occurredAt = args.occurredAt ?? nowEffective;
	const activityId = await ctx.db.insert('userTargetLanguageActivities', {
		userId,
		source: args.source,
		languageCode: args.languageCode,
		title: args.title,
		userTargetLanguageId: args.userTargetLanguageId,
		description: args.description ?? undefined,
		// Canonical ms field
		durationInMs: Math.max(0, Math.round(args.durationInMs)),
		updatedAt: occurredAt,
		state: 'completed',
		contentKey: args.contentKey ?? undefined,
		externalUrl: args.externalUrl ?? undefined,
	});

		// 2) Update streak
		const streak = await updateStreakOnActivity({
			ctx,
			args: {
				userId,
				occurredAt: occurredAt,
			}
		});

	// 3) Add experience (with optional streak bonus)
	const exp = await addExperience({
		ctx,
		args: {
			userId,
			languageCode: args.languageCode,
			languageActivityId: activityId,
			deltaExperience: await getExperienceForActivity({
				ctx,
				args: {
					userId,
					languageCode: args.languageCode,
					isManuallyTracked: args.source === 'manual',
					durationInMs: args.durationInMs,
					occurredAt,
				}
			}),
			isApplyingStreakBonus: true,
			durationInMs: args.durationInMs,
		},
	});

	return {
		activityId,
		currentStreak: streak.currentStreak,
		longestStreak: streak.longestStreak,
		experience: {
			userTargetLanguageId: exp.userTargetLanguageId,
			previousTotalExperience: exp.result.previousTotalExperience,
			newTotalExperience: exp.result.newTotalExperience,
			previousLevel: exp.result.previousLevel,
			newLevel: exp.result.newLevel,
			levelsGained: exp.result.levelsGained,
		},
	};
};

export const addManualLanguageActivity = mutation({
	args: {
		title: v.string(),
		description: v.optional(v.string()),
		durationInMs: v.number(),
		occurredAt: v.optional(v.number()),
		language: v.optional(languageCodeValidator),
		externalUrl: v.optional(v.string()),
		contentCategories: v.optional(
			v.array(
				v.union(
					v.literal('audio'),
					v.literal('video'),
					v.literal('text'),
					v.literal('other')
				)
			)
		),
	},
	returns: v.object({ activityId: v.id('userTargetLanguageActivities') }),
	handler: async (
		ctx,
		args
	): Promise<{ activityId: Id<'userTargetLanguageActivities'>; }> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error('Unauthorized');

		const nowEffective = await getEffectiveNow(ctx);
		const occurredAt = args.occurredAt ?? nowEffective;

		// Infer language from user's current target language id
		const user = await ctx.db.get(userId);
		if (!user) throw new Error('User not found');
		const currentTargetLanguageId = user.currentTargetLanguageId as
			| Id<'userTargetLanguages'>
			| undefined;
		if (!currentTargetLanguageId)
			throw new Error('User target language not found');
		const currentTargetLanguage = await ctx.db.get(currentTargetLanguageId);
		if (!currentTargetLanguage)
			throw new Error('User target language not found');
		const languageCode = currentTargetLanguage.languageCode as LanguageCode;

		const result = await addLanguageActivity({
			ctx,
			args: {
				userTargetLanguageId: currentTargetLanguage._id,
				title: args.title,
				description: args.description ?? undefined,
				durationInMs: args.durationInMs,
				occurredAt,
				externalUrl: args.externalUrl ?? undefined,
				source: 'manual',
				languageCode: languageCode as LanguageCode,
			},
		});

		return { activityId: result.activityId };
	},
});

export const listManualTrackedLanguageActivities = query({
	args: {},
	returns: v.array(v.string()),
	handler: async ctx => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return [];
		const userTargetLanguageActivities = await ctx.db
			.query('userTargetLanguageActivities')
			.withIndex('by_user', q => q.eq('userId', userId))
			.order('desc')
			.take(200);
		const set = new Set<string>();
		for (const targetLanguageActivity of userTargetLanguageActivities) {
			if (targetLanguageActivity.source === 'manual' && !(targetLanguageActivity.isDeleted) && targetLanguageActivity.title) set.add(targetLanguageActivity.title);
		}
		return Array.from(set).slice(0, 25);
	},
});

// List recent language activities with proper validator
export const listRecentLanguageActivities = query({
	args: { limit: v.optional(v.number()) },
	returns: v.object({
		items: v.array(
			v.object({
				_id: v.id('userTargetLanguageActivities'),
				_creationTime: v.number(),
				userId: v.id('users'),
				userTargetLanguageId: v.id('userTargetLanguages'),
				source: v.union(
					v.literal('manual'),
					v.literal('browser-extension-youtube-provider'),
					v.literal('browser-extension-website-provider')
				),
				languageCode: v.optional(languageCodeValidator),
				title: v.optional(v.string()),
				description: v.optional(v.string()),
				durationInMs: v.optional(v.number()),
				updatedAt: v.optional(v.number()),
				state: v.union(v.literal('in-progress'), v.literal('completed')),
				contentKey: v.optional(v.string()),
				externalUrl: v.optional(v.string()),
				label: v.optional(
					v.object({
						title: v.optional(v.string()),
						authorName: v.optional(v.string()),
						thumbnailUrl: v.optional(v.string()),
						fullDurationInSeconds: v.optional(v.number()),
						contentUrl: v.optional(v.string()),
					})
				),
				awardedExperience: v.number(),
			})
		),
		effectiveNow: v.number(),
	}),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return { items: [], effectiveNow: Date.now() };

		// Get the effective time (includes devDate if set)
		const effectiveNow = await getEffectiveNow(ctx);

			const limit = Math.max(1, Math.min(100, args.limit ?? 20));
			// Over-fetch to account for deleted items so we can still return `limit` non-deleted
			// entries without switching the endpoint to pagination.
			const targetFetch = Math.min(500, Math.max(limit * 3, limit + 10));
			// Use composite index to fetch only completed activities efficiently
			// Note: This query should only return completed activities, but if in-progress activities
			// are being returned, it indicates a bug in the activity processing logic
			const userTargetLanguageActivities = await ctx.db
			.query('userTargetLanguageActivities')
			.withIndex('by_user_and_state', q =>
				q.eq('userId', userId).eq('state', 'completed')
			)
			.order('desc')
				.take(targetFetch);
			const results: Array<any> = [];
			for (const languageActivity of userTargetLanguageActivities) {
			if (languageActivity.isDeleted) continue;
			let labelOut:
				| {
					title?: string;
					authorName?: string;
					thumbnailUrl?: string;
					fullDurationInSeconds?: number;
					contentUrl?: string;
				}
				| undefined;
			const contentKey = languageActivity.contentKey as string | undefined;
			if (contentKey) {
				const contentLabel = await ctx.db
					.query('contentLabels')
					.withIndex('by_content_key', q => q.eq('contentKey', contentKey))
					.unique();
				if (contentLabel) {
					labelOut = {
						title: contentLabel.title,
						authorName: contentLabel.authorName,
						thumbnailUrl: contentLabel.thumbnailUrl,
						fullDurationInSeconds: Math.max(
							0,
							Math.floor(((contentLabel.fullDurationInMs ?? 0) as number) / 1000)
						),
						contentUrl: contentLabel.contentUrl,
					};
				}
			}
			// Sum actual awarded experience tied to this activity from the ledger
			const experienceLedgers = await ctx.db
				.query('userTargetLanguageExperienceLedgers')
				.withIndex('by_language_activity', q =>
					q.eq('languageActivityId', languageActivity._id)
				)
				.collect();
			const awardedExperience = experienceLedgers.reduce(
				(sum: number, e: any) => sum + Math.floor(e?.deltaExperience ?? 0),
				0
			);
			results.push({
				...languageActivity,
				label: labelOut,
				awardedExperience: Math.max(0, awardedExperience),
			});
				if (results.length >= limit) break; // stop once we have enough non-deleted entries
		}
			return { items: results.slice(0, limit), effectiveNow };
	},
});

export const recentManualLanguageActivities = query({
	args: { limit: v.optional(v.number()) },
	returns: v.array(
		v.object({
			title: v.optional(v.string()),
			durationInMs: v.optional(v.number()),
			// categories removed from persisted schema
			description: v.optional(v.string()),
			userTargetLanguageId: v.id('userTargetLanguages'),
		})
	),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return [];
		const userTargetLanguageActivities = await ctx.db
			.query('userTargetLanguageActivities')
			.withIndex('by_user', q => q.eq('userId', userId))
			.order('desc')
			.take(Math.max(1, Math.min(20, args.limit ?? 8)));
		return userTargetLanguageActivities
			.filter(targetLanguageActivity => targetLanguageActivity.source === 'manual')
			.map(targetLanguageActivity => ({
				title: targetLanguageActivity.title,
				durationInMs: targetLanguageActivity.durationInMs,
				description: targetLanguageActivity.description,
				userTargetLanguageId: targetLanguageActivity.userTargetLanguageId,
			}));
	},
});

// Weekly source distribution for the current week (Mon-Sun), aggregated in minutes
export const getWeeklySourceDistribution = query({
	args: {},
	returns: v.array(
		v.object({
			day: v.string(),
			youtube: v.number(),
			spotify: v.number(),
			anki: v.number(),
			misc: v.number(),
		})
	),
	handler: async ctx => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return [];

		// Load user's preferred timezone (fallback to UTC)
		const user = await ctx.db.get(userId);
		const timeZone: string =
			user?.timezone ?? 'UTC';



		// Simpler timezone approach: get the current week's Monday-Sunday range in the user's timezone
		const effectiveNowMs = await getEffectiveNow(ctx);

		// Get current date in user's timezone
		const nowInUserTz = new Date(effectiveNowMs);
		const userTzFormatter = new Intl.DateTimeFormat('en-CA', {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			weekday: 'short',
		});

		const nowParts = userTzFormatter.formatToParts(nowInUserTz);
		const nowYear = parseInt(
			nowParts.find(p => p.type === 'year')?.value || '0',
			10
		);
		const nowMonth = parseInt(
			nowParts.find(p => p.type === 'month')?.value || '0',
			10
		);
		const nowDay = parseInt(
			nowParts.find(p => p.type === 'day')?.value || '0',
			10
		);
		const nowWeekday = nowParts.find(p => p.type === 'weekday')?.value || 'Mon';

		// Calculate days since Monday (0 = Monday, 6 = Sunday)
		const weekdayIndexMap: Record<string, number> = {
			Mon: 0,
			Tue: 1,
			Wed: 2,
			Thu: 3,
			Fri: 4,
			Sat: 5,
			Sun: 6,
		};
		const daysSinceMonday = weekdayIndexMap[nowWeekday] ?? 0;

		// Calculate Monday's date
		const mondayDate = new Date(
			nowYear,
			nowMonth - 1,
			nowDay - daysSinceMonday
		);
		const sundayDate = new Date(
			nowYear,
			nowMonth - 1,
			nowDay - daysSinceMonday + 6
		);

		// Get UTC timestamps for the start of Monday and end of Sunday in user's timezone
		const mondayStartLocalUtcMs =
			mondayDate.getTime() - mondayDate.getTimezoneOffset() * 60 * 1000;
		const sundayEndLocalUtcMs =
			sundayDate.getTime() -
			sundayDate.getTimezoneOffset() * 60 * 1000 +
			24 * 60 * 60 * 1000 -
			1;

		// Initialize 7-day bins Mon..Sun
		const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
		const bins: Array<{
			day: string;
			youtube: number;
			spotify: number;
			anki: number;
			misc: number;
		}> = labels.map(label => ({
			day: label,
			youtube: 0,
			spotify: 0,
			anki: 0,
			misc: 0,
		}));

		// Query activities within this local week window using UTC timestamps
		const targetLanguageActivitiesWithOccurredAt = await ctx.db
			.query('userTargetLanguageActivities')
			.withIndex('by_user', q => q.eq('userId', userId))
			.filter(q => q.and(
				q.gte(q.field('_creationTime'), mondayStartLocalUtcMs),
				q.lte(q.field('_creationTime'), sundayEndLocalUtcMs)
			))
			.collect();

		// Fallback: include docs missing `occurredAt` but created within this local week
		// This covers historical records created before `occurredAt` was consistently set.
		const allLanguageActivities = [...targetLanguageActivitiesWithOccurredAt];
		const targetLanguageActivities = await ctx.db
			.query('userTargetLanguageActivities')
			.withIndex('by_user', q => q.eq('userId', userId))
			.collect();
		for (const targetLanguageActivity of targetLanguageActivities) {
			const occ = targetLanguageActivity?.updatedAt;
			if (typeof occ === 'number') continue; // already included via _creationTime index
			const created = targetLanguageActivity._creationTime as number;
			if (created < mondayStartLocalUtcMs || created > sundayEndLocalUtcMs)
				continue;
			allLanguageActivities.push(targetLanguageActivity);
		}

		for (const targetLanguageActivity of allLanguageActivities) {
			if (targetLanguageActivity.isDeleted) continue;
			const occurred = targetLanguageActivity.updatedAt ?? targetLanguageActivity._creationTime;

			// Get the day of the week for this activity in the user's timezone
			const occurredInUserTz = new Date(occurred);
			const occurredParts = userTzFormatter.formatToParts(occurredInUserTz);
			const occurredWeekday =
				occurredParts.find(p => p.type === 'weekday')?.value || 'Mon';

			// Calculate day index (0 = Monday, 6 = Sunday)
			const dayIndex = weekdayIndexMap[occurredWeekday] ?? 0;
			if (dayIndex < 0 || dayIndex > 6) continue;

			const minutes = Math.max(
				0,
				Math.round((targetLanguageActivity.durationInMs ?? 0) / 60000)
			);

			const source = targetLanguageActivity.source;
			const inferred: 'youtube' | 'spotify' | 'anki' | 'misc' = source === 'browser-extension-youtube-provider'
				? 'youtube'
				: 'misc'; // All other sources (manual, website-provider) go to misc

			switch (inferred) {
				case 'youtube':
					bins[dayIndex].youtube += minutes;
					break;
				default:
					bins[dayIndex].misc += minutes;
			}
		}

		return bins;
	},
});

export const deleteLanguageActivity = mutation({
	args: { activityId: v.id('userTargetLanguageActivities') },
	returns: v.object({ deleted: v.boolean(), reversedDelta: v.number() }),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error('Unauthorized');

		const userTargetLanguageActivity = await ctx.db.get(args.activityId);
		if (!userTargetLanguageActivity) return { deleted: false, reversedDelta: 0 };
		if (userTargetLanguageActivity.userId !== userId) throw new Error('Forbidden');

		if (userTargetLanguageActivity.isDeleted) return { deleted: true, reversedDelta: 0 } as const;
		const userTargetLanguageId = userTargetLanguageActivity.userTargetLanguageId;
		const languageCode = userTargetLanguageActivity.languageCode;

		// Sum all experience deltas tied to this activity
		const userTargetLanguageExperienceLedgers = await ctx.db
			.query('userTargetLanguageExperienceLedgers')
			.withIndex('by_language_activity', q =>
				q.eq('languageActivityId', args.activityId)
			)
			.collect();
		const totalDelta = userTargetLanguageExperienceLedgers.reduce(
			(sum, e) => sum + (e.deltaExperience ?? 0),
			0
		);

		if (totalDelta !== 0) {
			await addExperience({
				ctx,
				args: {
					userId,
					languageCode: languageCode as LanguageCode,
					languageActivityId: args.activityId,
					deltaExperience: -totalDelta,
					isApplyingStreakBonus: false,
				},
			});
		}

		// Adjust totalMsLearning by subtracting this activity's duration
		const durationMs = Math.max(0, Math.round((userTargetLanguageActivity.durationInMs ?? 0)));
		if (durationMs > 0) {
			const userTargetLanguage = await ctx.db.get(userTargetLanguageId);
			if (userTargetLanguage) {
				const currentTotalMs = userTargetLanguage.totalMsLearning ?? 0;
				await ctx.db.patch(userTargetLanguageId, {
					totalMsLearning: Math.max(0, currentTotalMs - durationMs),
				});
			}
		}

		await ctx.db.patch(args.activityId, { isDeleted: true });
		return { deleted: true, reversedDelta: totalDelta };
	},
});

// Real-time activity recording function that creates or updates language activities
export const createOrUpdateLanguageActivityFromContent = async ({
	ctx,
	args,
}: {
	ctx: MutationCtx;
	args: {
		userId: Id<'users'>;
		contentKey: string;
		occurredAt: number;
		contentLabel?: {
			title?: string;
			contentLanguageCode?: LanguageCode;
			contentMediaType?: 'audio' | 'video' | 'text';
		};
		userTargetLanguageId: Id<'userTargetLanguages'>;
		userTargetLanguageCode: LanguageCode;
		source: 'browser-extension-youtube-provider' | 'browser-extension-website-provider';
	};
}): Promise<{
	activityId?: Id<'userTargetLanguageActivities'>;
	wasUpdated: boolean;
	wasCompleted: boolean;
}> => {
	const { userId, contentKey, occurredAt, contentLabel, userTargetLanguageId, userTargetLanguageCode } = args;

	// Determine the language to use for this activity
	let languageCode: LanguageCode;
	if (contentLabel?.contentLanguageCode) {
		// Use detected language if available
		languageCode = contentLabel.contentLanguageCode;
	} else {
		// Use user's target language as fallback
		languageCode = userTargetLanguageCode;
	}

	// Check if this content matches the user's target language
	if (contentLabel?.contentLanguageCode && contentLabel.contentLanguageCode !== userTargetLanguageCode) {
		// Content language doesn't match user's target language, skip
		return { wasUpdated: false, wasCompleted: false };
	}

	// Look for existing in-progress activity with this contentKey
	const existingActivity = await ctx.db
		.query('userTargetLanguageActivities')
		.withIndex('by_user_state_and_content_key', q => 
			q.eq('userId', userId).eq('state', 'in-progress').eq('contentKey', contentKey)
		)
		.unique();

	const title = contentLabel?.title ?? contentKey;
	const isWebsite = contentKey.startsWith('website:');

	// Early return if no existing activity - create new one
	if (!existingActivity) {
		const activityId = await ctx.db.insert('userTargetLanguageActivities', {
			userId,
			userTargetLanguageId,
			languageCode,
			contentKey,
			state: 'in-progress',
			title,
			source: args.source,
			durationInMs: 0,
			updatedAt: occurredAt,
		});

		return { activityId, wasUpdated: false, wasCompleted: false };
	}

	// Calculate timing and duration for existing activity
	const lastUpdateTime = existingActivity.updatedAt ?? existingActivity._creationTime;
	const startTime =  existingActivity._creationTime;
	const timeSinceLastUpdate = occurredAt - lastUpdateTime;
	const currentDurationMs = Math.max(0, occurredAt - startTime);
	
	// Determine if we should continue existing activity or start new one
	const shouldContinueActivity = timeSinceLastUpdate <= ACTIVITY_GAP_MS;
	const isLongEnoughForCompletion = currentDurationMs >= MIN_ACTIVITY_DURATION_MS;

	// Continue existing activity - just update duration
	if (shouldContinueActivity) {
		await ctx.db.patch(existingActivity._id, {
			durationInMs: Math.max(0, Math.round(currentDurationMs)),
			languageCode,
			title,
			updatedAt: occurredAt,
		});

		return { activityId: existingActivity._id, wasUpdated: true, wasCompleted: false };
	}

	// Gap exceeded - create new activity (cron will handle the old one)
	const newActivityId = await ctx.db.insert('userTargetLanguageActivities', {
		userId,
		userTargetLanguageId,
		languageCode,
		contentKey,
		state: 'in-progress',
		title,
		source: args.source,
		durationInMs: 0,
		updatedAt: occurredAt,
	});

	return { activityId: newActivityId, wasUpdated: false, wasCompleted: false };
};

// Update language activities when content labeling completes
export const updateLanguageActivitiesForContentLabel = internalMutation({
	args: {
		contentKey: v.string(),
		contentLanguageCode: languageCodeValidator,
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		// Find all in-progress activities with this contentKey
		// We need to query all activities and filter, since the index requires userId first
		const allActivities = await ctx.db
			.query('userTargetLanguageActivities')
			.filter(q => q.and(
				q.eq(q.field('state'), 'in-progress'),
				q.eq(q.field('contentKey'), args.contentKey)
			))
			.collect();

		for (const activity of allActivities) {
			// Get the user's target language
			const user = await ctx.db.get(activity.userId);
			if (!user?.currentTargetLanguageId) continue;

			const userTargetLanguage = await ctx.db.get(user.currentTargetLanguageId);
			if (!userTargetLanguage?.languageCode) continue;

			// Check if the detected language matches the user's target language
			if (args.contentLanguageCode === userTargetLanguage.languageCode) {
				// Update the activity with the detected language
				await ctx.db.patch(activity._id, {
					languageCode: args.contentLanguageCode,
				});
			} else {
				// Language doesn't match, mark as deleted
				await ctx.db.patch(activity._id, {
					isDeleted: true,
				});
			}
		}

		return null;
	},
});

// Internal query to find stale in-progress activities for cron processing
export const listStaleInProgressActivities = internalQuery({
	args: { batchSize: v.number() },
	returns: v.array(v.object({
		_id: v.id('userTargetLanguageActivities'),
		userId: v.id('users'),
		userTargetLanguageId: v.id('userTargetLanguages'),
		languageCode: v.optional(languageCodeValidator),
		contentKey: v.optional(v.string()),
		source: v.union(
			v.literal('manual'),
			v.literal('browser-extension-youtube-provider'),
			v.literal('browser-extension-website-provider')
		),
		state: v.union(v.literal('in-progress'), v.literal('completed')),
		title: v.optional(v.string()),
		durationInMs: v.optional(v.number()),
		updatedAt: v.optional(v.number()),
		_creationTime: v.number(),
	})),
	handler: async (ctx, args): Promise<Array<{
		_id: Id<'userTargetLanguageActivities'>;
		userId: Id<'users'>;
		userTargetLanguageId: Id<'userTargetLanguages'>;
		languageCode?: LanguageCode;
		contentKey?: string;
		source: 'manual' | 'browser-extension-youtube-provider' | 'browser-extension-website-provider';
		state: 'in-progress' | 'completed';
		title?: string;
		durationInMs?: number;
		updatedAt?: number;
		_creationTime: number;
	}>> => {
		const nowEffective = Date.now();
		const staleThreshold = nowEffective - ACTIVITY_GAP_MS;
		
		// Query all in-progress activities
		// Note: We need to query all users since the index requires userId first
		const allInProgress = await ctx.db
			.query('userTargetLanguageActivities')
			.filter(q => q.eq(q.field('state'), 'in-progress'))
			.take(args.batchSize);
		
		// Filter to those that are stale
		return allInProgress.filter(activity => {
			const lastUpdate = activity.updatedAt ?? activity._creationTime;
			return lastUpdate < staleThreshold;
		});
	},
});

// Internal mutation to process a single stale activity (complete or delete)
export const processStaleActivity = internalMutation({
	args: {
		activityId: v.id('userTargetLanguageActivities'),
	},
	returns: v.object({
		processed: v.boolean(),
		action: v.union(v.literal('completed'), v.literal('deleted'), v.literal('skipped')),
	}),
	handler: async (ctx, args): Promise<{
		processed: boolean;
		action: 'completed' | 'deleted' | 'skipped';
	}> => {
		const activity = await ctx.db.get(args.activityId);
		if (!activity || activity.state !== 'in-progress') {
			return { processed: false, action: 'skipped' as const };
		}

		const existingDurationMs = activity.durationInMs ?? 0;
		const isLongEnoughForCompletion = existingDurationMs >= MIN_ACTIVITY_DURATION_MS;

		if (isLongEnoughForCompletion) {
			// Complete the activity using existing duration
			await ctx.db.patch(activity._id, {
				state: 'completed',
			});

			// Update streak
			await updateStreakOnActivity({
				ctx,
				args: { userId: activity.userId, occurredAt: activity._creationTime }
			});

			// Add experience
			const languageCode = activity.languageCode as LanguageCode;
			await addExperience({
				ctx,
				args: {
					userId: activity.userId,
					languageCode,
					languageActivityId: activity._id,
					isApplyingStreakBonus: true,
					durationInMs: existingDurationMs,
					deltaExperience: await getExperienceForActivity({
						ctx,
						args: {
							userId: activity.userId,
							languageCode,
							isManuallyTracked: false,
							durationInMs: existingDurationMs,
							occurredAt: activity._creationTime,
						}
					})
				}
			});

			return { processed: true, action: 'completed' as const };
		} else {
			// Activity too short - delete it
			await ctx.db.delete(activity._id);
			return { processed: true, action: 'deleted' as const };
		}
	},
});

