import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import {
	type ApplyExperienceResult,
	applyExperience,
} from '../lib/levelAndExperienceCalculations/levelAndExperienceCalculator';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import {
	internalMutation,
	internalQuery,
	mutation,
	query,
} from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { LanguageCode, languageCodeValidator } from './schema';
import { getStreakBonusMultiplier } from './userStreakFunctions';

/* ------------------- XP constants & helpers ------------------- */

// Target calibration: ~100 XP per hour baseline
const HOUR_XP = 100;
const BASE_RATE_PER_MIN = HOUR_XP / 60; // ≈ 1.6667
// Daily cap: at most 16 hours per UTC day counted toward XP
const DAILY_XP_CAP_MINUTES = 16 * 60;

// Day bucketing (UTC 24h windows)
const DAY_MS = 24 * 60 * 60 * 1000;
function dayStartMsOf(timestampMs: number): number {
	return Math.floor(timestampMs / DAY_MS) * DAY_MS;
}

export const getExperienceForActivity = async ({
	ctx,
	args,
}: {
	ctx: QueryCtx;
	args: {
		userId: Id<'users'>;
		languageCode: LanguageCode;
		isManuallyTracked?: boolean;
		durationInMs?: number;
		occurredAt?: number;
	};
}): Promise<number> => {
	const { durationInMs } = args;
	const minutes = Math.max(0, Math.floor((durationInMs ?? 0) / 60000));
	if (minutes <= 0) return 0;

	const when = args.occurredAt ?? Date.now();
	const dayStart = dayStartMsOf(when);
	const dayEnd = dayStart + DAY_MS - 1;

	// Sum total minutes already recorded for this user today
	const activitiesOnThisDay = await ctx.db
		.query('userTargetLanguageActivities')
		.withIndex('by_user_and_occurred', (q) =>
			q
				.eq('userId', args.userId)
				.gte('occurredAt', dayStart)
				.lte('occurredAt', dayEnd)
		)
		.collect();
	const totalMinutesToday = activitiesOnThisDay.reduce(
		(sum: number, userTargetLanguageActivity: any) => {
			const ms = Math.max(
				0,
				Math.floor(userTargetLanguageActivity?.durationInMs ?? 0)
			);
			return sum + Math.floor(ms / 60000);
		},
		0
	);

	// Subtract this entry's minutes if it was already inserted before this query
	const priorMinutes = Math.max(0, totalMinutesToday - minutes);
	const remaining = Math.max(0, DAILY_XP_CAP_MINUTES - priorMinutes);
	const effectiveMinutes = Math.max(0, Math.min(minutes, remaining));
	const rawXp = BASE_RATE_PER_MIN * effectiveMinutes;
	return Math.max(0, Math.round(rawXp));
};

export const addExperience = async ({
	ctx,
	args,
}: {
	ctx: MutationCtx;
	args: {
		userId: Id<'users'>;
		languageCode: string;
		deltaExperience: number;
		languageActivityId?: Id<'userTargetLanguageActivities'>;
		isApplyingStreakBonus?: boolean;
		durationInMs?: number;
	};
}): Promise<{
	userTargetLanguageId: Id<'userTargetLanguages'>;
	experienceEventId: Id<'userTargetLanguageExperienceLedgers'>;
	result: ApplyExperienceResult;
}> => {
	const { userId, languageCode } = args;

	const userTargetLanguage = await ctx.db
		.query('userTargetLanguages')
		.withIndex('by_user_and_language', q =>
			q.eq('userId', userId).eq('languageCode', languageCode as LanguageCode)
		)
		.unique();

	if (!userTargetLanguage) {
		throw new Error(
			`User target language not found for user ${userId} and language ${languageCode}`
		);
	}

	// Load previous total from most recent ledger event
	const latest = (
		await ctx.db
			.query('userTargetLanguageExperienceLedgers')
			.withIndex('by_user_target_language', q =>
				q.eq('userTargetLanguageId', userTargetLanguage._id)
			)
			.order('desc')
			.take(1)
	)[0];

	const previousTotal = latest?.runningTotalAfter ?? 0;

	// Base delta and multipliers
	const baseDelta = Math.floor(args.deltaExperience ?? 0);
	let finalDelta = baseDelta;
	const multipliers: Array<{ type: 'streak'; value: number; }> = [];

	if (args.isApplyingStreakBonus) {
		const value: number = await getStreakBonusMultiplier(ctx, userId);
		finalDelta = Math.floor(baseDelta * Math.max(0, value));
		multipliers.push({ type: 'streak', value });
	}

	const result: ApplyExperienceResult = applyExperience({
		currentTotalExperience: previousTotal,
		deltaExperience: finalDelta,
	});

	// Update totalMsLearning directly if provided
	if (args.durationInMs && args.durationInMs > 0) {
		const currentTotalMs = Math.floor(
			((userTargetLanguage as any).totalMsLearning ?? 0)
		);
		const newTotalMs = Math.max(0, currentTotalMs + Math.floor(args.durationInMs));
		await ctx.db.patch(userTargetLanguage._id, {
			totalMsLearning: newTotalMs,
		});
	}

	// occurredAt from activity if available; otherwise now
	let occurredAt: number | undefined;
	if (args.languageActivityId) {
		const act = await ctx.db.get(args.languageActivityId);
		occurredAt = (act as any)?.occurredAt ?? undefined;
	}
	if (occurredAt === undefined) occurredAt = Date.now();

	// Insert ledger event
	const experienceEventId = await ctx.db.insert(
		'userTargetLanguageExperienceLedgers',
		{
			userId,
			userTargetLanguageId: userTargetLanguage._id,
			languageActivityId: args.languageActivityId,
			baseExperience: baseDelta,
			deltaExperience: finalDelta,
			runningTotalAfter: result.newTotalExperience,
			occurredAt,
			multipliers: multipliers.length ? multipliers : undefined,
			previousLevel: result.previousLevel,
			newLevel: result.newLevel,
			levelsGained: result.levelsGained,
			remainderTowardsNextLevel: result.remainderTowardsNextLevel,
			nextLevelCost: result.nextLevelCost,
			lastLevelCost: result.lastLevelCost,
		} as any
	);

	// Update streak per-day aggregates (xpGained) and day ledger
	const dayStartMs = dayStartMsOf(occurredAt!);
	const existingDay = await ctx.db
		.query('userStreakDays')
		.withIndex('by_user_and_day', q =>
			q.eq('userId', userId).eq('dayStartMs', dayStartMs)
		)
		.unique();
	if (existingDay) {
		await ctx.db.patch(existingDay._id, {
			xpGained: Math.max(0, ((existingDay as any).xpGained ?? 0) + finalDelta),
			lastEventAtMs: Math.max(
				(existingDay as any).lastEventAtMs ?? 0,
				occurredAt!
			),
		} as any);
	} else {
		await ctx.db.insert('userStreakDays', {
			userId,
			dayStartMs,
			trackedMs: 0,
			xpGained: Math.max(0, finalDelta),
			credited: false,
			streakLength: 0,
			lastEventAtMs: occurredAt!,
		} as any);
	}
	await ctx.db.insert('userStreakDayLedgers', {
		userId,
		dayStartMs,
		occurredAt: occurredAt!,
		reason: 'xp_delta',
		xpDelta: finalDelta,
		source: 'user',
	} as any);

	return {
		userTargetLanguageId: userTargetLanguage._id,
		experienceEventId,
		result,
	};
};

export const listExperienceHistory = query({
	args: { limit: v.optional(v.number()) },
	returns: v.array(
		v.object({
			_id: v.id('userTargetLanguageExperienceLedgers'),
			_creationTime: v.number(),
			languageActivityId: v.optional(v.id('userTargetLanguageActivities')),
			deltaExperience: v.number(),
			baseExperience: v.optional(v.number()),
			runningTotalAfter: v.number(),
			occurredAt: v.optional(v.number()),
			note: v.optional(v.string()),
			multipliers: v.optional(
				v.array(
					v.object({
						type: v.union(v.literal('streak')),
						value: v.number(),
					})
				)
			),
		})
	),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return [];

		const user = await ctx.db.get(userId);
		if (!user) return [];

		const currentTargetLanguageId = (user as any).currentTargetLanguageId as
			| Id<'userTargetLanguages'>
			| undefined;
		if (!currentTargetLanguageId) return [];

		const limit = Math.max(1, Math.min(200, args.limit ?? 50));
		const events = await ctx.db
			.query('userTargetLanguageExperienceLedgers')
			.withIndex('by_user_target_language', q =>
				q.eq('userTargetLanguageId', currentTargetLanguageId)
			)
			.order('desc')
			.take(limit);

		return events as any;
	},
});

export const deleteExperienceEvent = mutation({
	args: { experienceId: v.id('userTargetLanguageExperienceLedgers') },
	returns: v.object({
		reversalEventId: v.id('userTargetLanguageExperienceLedgers'),
	}),
	handler: async (
		ctx,
		args
	): Promise<{
		reversalEventId: Id<'userTargetLanguageExperienceLedgers'>;
	}> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error('Unauthorized');

		const exp = await ctx.db.get(args.experienceId);
		if (!exp) throw new Error('Experience event not found');
		if ((exp as any).userId !== userId) throw new Error('Forbidden');

		const delta = Math.floor((exp as any).deltaExperience ?? 0);
		const utlId = (exp as any)
			.userTargetLanguageId as Id<'userTargetLanguages'>;
		const utl = await ctx.db.get(utlId);
		if (!utl) throw new Error('Target language missing');
		const languageCode = (utl as any).languageCode;

		const out = await addExperience({
			ctx,
			args: {
				userId,
				languageCode,
				languageActivityId: (exp as any).languageActivityId,
				deltaExperience: -delta,
				isApplyingStreakBonus: false,
			},
		});

		await ctx.db.patch(out.experienceEventId, {
			note: `reversal_of:${args.experienceId}`,
		} as any);

		// Also decrement per-day xp aggregate and write day ledger if exp had occurredAt
		const occurredAt: number | undefined = (exp as any).occurredAt ?? undefined;
		if (occurredAt !== undefined) {
			const dayStartMs = dayStartMsOf(occurredAt);
			const day = await ctx.db
				.query('userStreakDays')
				.withIndex('by_user_and_day', q =>
					q.eq('userId', userId).eq('dayStartMs', dayStartMs)
				)
				.unique();
			if (day) {
				const newXp = Math.max(0, ((day as any).xpGained ?? 0) - delta);
				await ctx.db.patch((day as any)._id, { xpGained: newXp } as any);
			}
			await ctx.db.insert('userStreakDayLedgers', {
				userId,
				dayStartMs,
				occurredAt: Date.now(),
				reason: 'xp_delta',
				xpDelta: -delta,
				source: 'user',
				note: `reversal_of:${args.experienceId}`,
			} as any);
		}
		return { reversalEventId: out.experienceEventId };
	},
});
