import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import {
	internalMutation,
	internalQuery,
	mutation,
	MutationCtx,
	query,
	QueryCtx,
} from './_generated/server';
import { getEffectiveNow } from './utils';

// -----------------------------
// Constants & helpers
// -----------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const VACATION_CAP = 7;
const VACATION_COST = 1500;

function dayStartMsOf(timestampMs: number): number {
	return Math.floor(timestampMs / DAY_MS) * DAY_MS;
}

async function getVacationBalance(
	ctx: QueryCtx,
	userId: Id<'users'>
): Promise<number> {
	const user = await ctx.db.get(userId);
	if (!user) return 0;
	const currentTargetLanguageId = user.currentTargetLanguageId as
		| Id<'userTargetLanguages'>
		| undefined;
	let totalExperience = 0;
	if (currentTargetLanguageId) {
		const latest = (
			await ctx.db
				.query('userTargetLanguageExperienceLedgers')
				.withIndex('by_user_target_language', q =>
					q.eq('userTargetLanguageId', currentTargetLanguageId)
				)
				.order('desc')
				.take(1)
		)[0];
		totalExperience = Math.max(0, latest?.runningTotalAfter ?? 0);
	}
	const earned = Math.floor(totalExperience / VACATION_COST);
	const [grants, uses] = await Promise.all([
		ctx.db
			.query('userStreakVacationLedgers')
			.withIndex('by_user_and_reason', q => q.eq('userId', userId).eq('reason', 'grant'))
			.collect()
			.then(ledger => ledger.length),
		ctx.db
			.query('userStreakVacationLedgers')
			.withIndex('by_user_and_reason', q => q.eq('userId', userId).eq('reason', 'use'))
			.collect()
			.then(ledger => ledger.length)
	]);
	const balance = Math.max(0, earned + grants - uses);
	return Math.min(VACATION_CAP, balance);
}

// Fetch the most recent credited streak day for a user, optionally before a given day.
async function getMostRecentCreditedStreakDay(
	ctx: QueryCtx,
	userId: Id<'users'>,
	beforeDayStartMs?: number
): Promise<any | undefined> {
	const rows = await ctx.db
		.query('userStreakDays')
		.withIndex('by_user_and_day', q => {
			if (beforeDayStartMs !== undefined) {
				return q.eq('userId', userId).lt('dayStartMs', beforeDayStartMs);
			}
			return q.eq('userId', userId);
		})
		.order('desc')
		.take(50);
	return rows.find((r: any) => r.credited);
}

// Load the `streakDays` row for a user and day; if missing, create a default one and return it.
async function getOrCreateStreakDay(
	ctx: MutationCtx,
	userId: Id<'users'>,
	dayStartMs: number,
	nowUtc: number
): Promise<any> {
	let row = await ctx.db
		.query('userStreakDays')
		.withIndex('by_user_and_day', q =>
			q.eq('userId', userId).eq('dayStartMs', dayStartMs)
		)
		.unique();
	if (!row) {
		await ctx.db.insert('userStreakDays', {
			userId,
			dayStartMs,
			trackedMinutes: 0,
			xpGained: 0,
			credited: false,
			streakLength: 0,
			lastEventAtMs: nowUtc,
		} as any);
		row = await ctx.db
			.query('userStreakDays')
			.withIndex('by_user_and_day', q =>
				q.eq('userId', userId).eq('dayStartMs', dayStartMs)
			)
			.unique();
	}
	return row;
}

async function creditMissingDayWithVacation(
	ctx: MutationCtx,
	userId: Id<'users'>,
	missingDayStartMs: number,
	prevStreakLen: number,
	nowUtc: number,
	source: 'user' | 'system_nudge'
): Promise<boolean> {
	const balance = await getVacationBalance(ctx, userId);
	if (balance <= 0) return false;

	const coveredStreakLen = prevStreakLen + 1;
	const existing = await ctx.db
		.query('userStreakDays')
		.withIndex('by_user_and_day', q =>
			q.eq('userId', userId).eq('dayStartMs', missingDayStartMs)
		)
		.unique();
	if (!existing) {
		await ctx.db.insert('userStreakDays', {
			userId,
			dayStartMs: missingDayStartMs,
			trackedMinutes: 0,
			xpGained: 0,
			credited: true,
			creditedKind: 'vacation',
			streakLength: coveredStreakLen,
			lastEventAtMs: nowUtc,
			autoVacationAppliedAtMs: nowUtc,
		} as any);
	} else if (!existing.credited) {
		await ctx.db.patch(existing._id, {
			credited: true,
			creditedKind: 'vacation',
			streakLength: coveredStreakLen,
			autoVacationAppliedAtMs: nowUtc,
		} as any);
	}
	await ctx.db.insert('userStreakDayLedgers', {
		userId,
		dayStartMs: missingDayStartMs,
		occurredAt: nowUtc,
		reason: 'credit_vacation',
		streakLengthAfter: coveredStreakLen,
		source,
	} as any);
	await ctx.db.insert('userStreakVacationLedgers', {
		userId,
		occurredAt: nowUtc,
		reason: 'use',
		delta: -1,
		newTotal: balance - 1,
		coveredDayStartMs: missingDayStartMs,
		source: source === 'system_nudge' ? 'auto_nudge' : 'manual',
	} as any);
	return true;
}

async function creditDayByActivity(
	ctx: MutationCtx,
	userId: Id<'users'>,
	dayStartMs: number,
	streakLength: number,
	nowUtc: number
): Promise<void> {
	await ctx.db.insert('userStreakDayLedgers', {
		userId,
		dayStartMs,
		occurredAt: nowUtc,
		reason: 'credit_activity',
		streakLengthAfter: streakLength,
		source: 'user',
	} as any);
	const row = await getOrCreateStreakDay(ctx, userId, dayStartMs, nowUtc);
	await ctx.db.patch(row._id, {
		credited: true,
		creditedKind: 'activity',
		streakLength,
		lastEventAtMs: nowUtc,
	} as any);
}

// -----------------------------
// Mutations & Queries
// -----------------------------
export const updateStreakDays = async ({
	ctx,
	args,
}: {
	ctx: MutationCtx;
	args: {
		userId: Id<'users'>;
		occurredAt?: number;
	};
}): Promise<{
	trackedMs: number;
	xpGained: number;
}> => {
	const user = await ctx.db.get(args.userId);
	if (!user) throw new Error('User not found');

	const nowUtc = args.occurredAt ?? Date.now();
	const dayStart = dayStartMsOf(nowUtc);
	const dayEnd = dayStart + DAY_MS - 1;

	// Aggregate activities in this day
	const activitiesOnThisDay = await ctx.db
		.query('userTargetLanguageActivities')
		.withIndex('by_user_and_occurred', q =>
			q
				.eq('userId', args.userId)
				.gte('occurredAt', dayStart)
				.lte('occurredAt', dayEnd)
		)
		.collect();

	const trackedMs = activitiesOnThisDay.reduce((sum: number, a: any) => {
		const ms = Math.max(0, Math.floor(a?.durationInMs ?? 0));
		return sum + ms;
	}, 0);

	// Aggregate XP deltas from experience ledger by occurredAt
	const xpEvents = await ctx.db
		.query('userTargetLanguageExperienceLedgers')
		.withIndex('by_user', q => q.eq('userId', args.userId))
		.collect();
	const xpGained = xpEvents.reduce((sum: number, e: any) => {
		const t = e.occurredAt ?? 0;
		if (t >= dayStart && t <= dayEnd)
			return sum + Math.floor(e.deltaExperience ?? 0);
		return sum;
	}, 0);

	// Upsert streakDays for this day
	const existing = await ctx.db
		.query('userStreakDays')
		.withIndex('by_user_and_day', q =>
			q.eq('userId', args.userId).eq('dayStartMs', dayStart)
		)
		.unique();

	if (existing) {
		await ctx.db.patch(existing._id, {
			trackedMs,
			xpGained,
			lastEventAtMs: Math.max(existing.lastEventAtMs ?? 0, nowUtc),
		} as any);
	} else {
		await ctx.db.insert('userStreakDays', {
			userId: args.userId,
			dayStartMs: dayStart,
			trackedMs,
			xpGained,
			credited: false,
			streakLength: 0,
			lastEventAtMs: nowUtc,
		} as any);
	}

	return { trackedMs, xpGained };
};

export const updateStreakOnActivity = async ({
	ctx,
	args,
}: {
	ctx: MutationCtx;
	args: {
		userId: Id<'users'>;
		occurredAt?: number; // UTC ms; defaults to now
	};
}): Promise<{
	currentStreak: number;
	longestStreak: number;
	didIncrementToday: boolean; // "today" now means "in this 24h window"
}> => {
	const user = await ctx.db.get(args.userId);
	if (!user) throw new Error('User not found');

	const nowUtc = args.occurredAt ?? Date.now();
	const todayStart = dayStartMsOf(nowUtc);

	// Refresh aggregates for today
	await updateStreakDays({
		ctx,
		args: {
			userId: args.userId,
			occurredAt: nowUtc,
		}
	});

	// Ensure today's row exists
	const today = await getOrCreateStreakDay(
		ctx,
		args.userId,
		todayStart,
		nowUtc
	);

	// If already credited today, no increment
	if (today.credited) {
		const currentStreak = today.streakLength ?? user.currentStreak ?? 0;
		const longestStreak = Math.max(user.longestStreak ?? 0, currentStreak);
		if (
			(user.currentStreak ?? 0) !== currentStreak ||
			(user.longestStreak ?? 0) !== longestStreak
		) {
			await ctx.db.patch(args.userId, {
				currentStreak,
				longestStreak,
			});
		}
		return { currentStreak, longestStreak, didIncrementToday: false };
	}

	// Find previous credited day
	const prev = await getMostRecentCreditedStreakDay(
		ctx,
		args.userId,
		todayStart
	);

	let streakLength = 1;

	if (prev && prev.credited) {
		const gap = todayStart - prev.dayStartMs;
		if (gap === DAY_MS) {
			streakLength = (prev.streakLength ?? 0) + 1;
		} else if (gap === 2 * DAY_MS) {
			const missingDayStart = prev.dayStartMs + DAY_MS;
			const used = await creditMissingDayWithVacation(
				ctx,
				args.userId,
				missingDayStart,
				prev.streakLength ?? 0,
				nowUtc,
				'user'
			);
			if (used) {
				streakLength = (prev.streakLength ?? 0) + 2;
			} else {
				streakLength = 1;
			}
		} else {
			// Gap > 48h
			streakLength = 1;
		}
	}

	await creditDayByActivity(
		ctx,
		args.userId,
		todayStart,
		streakLength,
		nowUtc
	);

	const currentStreak = streakLength;
	const longestStreak = Math.max(user.longestStreak ?? 0, currentStreak);
	await ctx.db.patch(args.userId, {
		currentStreak,
		longestStreak,
		lastStreakCreditAt: nowUtc,
	});
	return { currentStreak, longestStreak, didIncrementToday: true };
};

import {
	calculateStreakBonusMultiplier,
	HABIT_CAP_DAYS,
} from '../lib/streakBonus';

export const getStreakBonusMultiplier = async (
	ctx: QueryCtx,
	userId: Id<'users'>
): Promise<number> => {
	// Prefer latest credited streakDays
	const latestCredited = await getMostRecentCreditedStreakDay(
		ctx,
		userId
	);
	const currentStreak = Math.max(0, latestCredited?.streakLength ?? 0);
	const multiplier = calculateStreakBonusMultiplier(currentStreak);
	return multiplier; // e.g., 1.476
};

export const getStreakDataForHeatmap = query({
	args: {
		days: v.optional(v.number()),
	},
	returns: v.union(
		v.object({
			values: v.array(v.number()),
			activityCounts: v.array(v.number()),
			vacationFlags: v.array(v.boolean()),
			currentStreak: v.number(),
			longestStreak: v.number(),
			totalDays: v.number(),
		}),
		v.null()
	),
	handler: async (ctx, args) => {
		try {
			const userId = await getAuthUserId(ctx);
			if (!userId) return null;

			const days = args.days ?? 365;
			const user = await ctx.db.get(userId);
			if (!user) return null;

			// In dangerous testing mode, anchor the heatmap window to the user's devDate if set
			const nowEffective = await getEffectiveNow(ctx);

			const startDate = new Date(
				nowEffective - (days - 1) * 24 * 60 * 60 * 1000
			);
			const startDay =
				Math.floor(startDate.getTime() / (24 * 60 * 60 * 1000)) *
				(24 * 60 * 60 * 1000);

			const currentStreak = user.currentStreak ?? 0;
			const longestStreak = user.longestStreak ?? 0;

			// Get all streak days for the user
			const daysRows = await ctx.db
				.query('userStreakDays')
				.withIndex('by_user', q => q.eq('userId', userId))
				.collect();

			// Create maps for quick lookups
			// 1) dayStartMs -> trackedMinutes
			const dayToMinutes = new Map<number, number>();
			// 2) set of dayStartMs covered by a streak vacation
			const vacationDays = new Set<number>();
			for (const row of daysRows) {
				// Prefer trackedMs (milliseconds) and convert to minutes; fallback to legacy trackedMinutes if present
				const trackedMs = Math.max(
					0,
					Math.floor(((row as any).trackedMs ?? 0) as number)
				);
				const minutes = Math.max(
					0,
					Math.floor(
						((row as any).trackedMinutes ?? trackedMs / 60000) as number
					)
				);
				const day = (row as any).dayStartMs as number;
				dayToMinutes.set(day, minutes);
				if ((row as any).credited && (row as any).creditedKind === 'vacation') {
					vacationDays.add(day);
				}
			}

			// First pass: collect minutes per day across the window
			const minutesWindow: number[] = [];
			const vacationFlags: boolean[] = [];
			for (let i = 0; i < days; i++) {
				const dayTimestamp = startDay + i * DAY_MS;
				const activities = dayToMinutes.get(dayTimestamp) ?? 0;
				minutesWindow.push(activities);
				vacationFlags.push(vacationDays.has(dayTimestamp));
			}

			// Compute average minutes across the window (include zeros)
			const totalMinutes = minutesWindow.reduce((sum, n) => sum + n, 0);
			const avgMinutes = days > 0 ? totalMinutes / days : 0;

			// Get non-zero minutes for better threshold calculation
			const nonZeroMinutes = minutesWindow.filter(m => m > 0);
			const medianMinutes =
				nonZeroMinutes.length > 0
					? nonZeroMinutes.sort((a, b) => a - b)[
							Math.floor(nonZeroMinutes.length / 2)
						]
					: 0;

			// Use median for more robust thresholds, fallback to average
			const baseMinutes = medianMinutes > 0 ? medianMinutes : avgMinutes;

			// Dynamic thresholds based on median/average - more aggressive to show red
			const t1 = Math.max(5, baseMinutes * 0.2); // start of gradient (min 5 minutes)
			const t2 = Math.max(15, baseMinutes * 0.4); // mid gradient (min 15 minutes)
			const t3 = Math.max(30, baseMinutes * 0.6); // high intensity (min 30 minutes)
			const t4 = Math.max(60, baseMinutes * 0.8); // very high intensity (min 60 minutes)

			// Debug logging
			console.log('Heatmap thresholds:', {
				t1,
				t2,
				t3,
				t4,
				baseMinutes,
				medianMinutes,
				avgMinutes,
			});

			// Second pass: compute intensities and expose activity counts
			const activityCounts: number[] = [];
			const values: number[] = [];
			for (let i = 0; i < days; i++) {
				const activities = minutesWindow[i] ?? 0;
				activityCounts.push(activities);

				// Convert minutes learned to heatmap intensity (0-4)
				let intensity = 0;
				if (activities > 0) {
					if (baseMinutes <= 0 || nonZeroMinutes.length === 0) {
						// Fallback absolute thresholds if no meaningful data
						if (activities < 5) intensity = 1;
						else if (activities < 15) intensity = 2;
						else if (activities < 30) intensity = 3;
						else if (activities < 60) intensity = 4;
						else intensity = 4; // Very high activity gets max intensity (4)
					} else {
						if (activities < t1) intensity = 1;
						else if (activities < t2) intensity = 2;
						else if (activities < t3) intensity = 3;
						else if (activities < t4) intensity = 4;
						else intensity = 4; // Above 80% of median/average => max color (4)
					}

					// Debug logging for high activity days
					if (activities > 200) {
						console.log(
							`High activity day: ${activities} minutes -> intensity ${intensity}`
						);
					}
				}
				values.push(intensity);
			}

			return {
				values,
				activityCounts,
				vacationFlags,
				currentStreak,
				longestStreak,
				totalDays: days,
			};
		} catch (error) {
			// Return null for any errors (including unauthorized)
			return null;
		}
	},
});

export const nudgeUserStreak = async ({
	ctx,
	args,
}: {
	ctx: MutationCtx;
	args: {
		userId: Id<'users'>;
		now?: number;
	};
}): Promise<{
	usedFreeze: boolean;
	coveredDayStartMs?: number;
}> => {
	const user = await ctx.db.get(args.userId);
	if (!user) throw new Error('User not found');

	const nowUtc = args.now ?? Date.now();
	const todayStart = dayStartMsOf(nowUtc);

	// Find the most recent credited day
	const prev = (
		await ctx.db
			.query('userStreakDays')
			.withIndex('by_user_and_day', q => q.eq('userId', args.userId))
			.order('desc')
			.take(1)
	)[0];

	if (!prev || !prev.credited) return { usedFreeze: false };

	const gap = todayStart - prev.dayStartMs;
	if (gap !== DAY_MS * 2) {
		// Only auto-bridge exactly one missed day
		return { usedFreeze: false };
	}

	const missingDayStart = prev.dayStartMs + DAY_MS;

	// If the missing day is already credited, nothing to do
	const missing = await ctx.db
		.query('userStreakDays')
		.withIndex('by_user_and_day', q =>
			q.eq('userId', args.userId).eq('dayStartMs', missingDayStart)
		)
		.unique();
	if (missing && missing.credited) {
		return { usedFreeze: false };
	}

	// Need a vacation available
	const balance = await getVacationBalance(ctx, args.userId);
	if (balance <= 0) return { usedFreeze: false };

	const coveredStreakLen = (prev.streakLength ?? 0) + 1;

	if (!missing) {
		await ctx.db.insert('userStreakDays', {
			userId: args.userId,
			dayStartMs: missingDayStart,
			trackedMs: 0,
			xpGained: 0,
			credited: true,
			creditedKind: 'vacation',
			streakLength: coveredStreakLen,
			lastEventAtMs: nowUtc,
			autoVacationAppliedAtMs: nowUtc,
		});
	} else {
		await ctx.db.patch(missing._id, {
			credited: true,
			creditedKind: 'vacation',
			streakLength: coveredStreakLen,
			autoVacationAppliedAtMs: nowUtc,
		});
	}

	await ctx.db.insert('userStreakDayLedgers', {
		userId: args.userId,
		dayStartMs: missingDayStart,
		occurredAt: nowUtc,
		reason: 'credit_vacation',
		streakLengthAfter: coveredStreakLen,
		source: 'system_nudge',
	});

	await ctx.db.insert('userStreakVacationLedgers', {
		userId: args.userId,
		occurredAt: nowUtc,
		reason: 'use',
		delta: -1,
		newTotal: balance - 1,
		coveredDayStartMs: missingDayStart,
		source: 'auto_nudge',
	});

	// Optionally update user's currentStreak if this increases the latest credited day
	const currentStreak = Math.max(user.currentStreak ?? 0, coveredStreakLen);
	const longestStreak = Math.max(user.longestStreak ?? 0, currentStreak);
	await ctx.db.patch(args.userId, { currentStreak, longestStreak });

	return { usedFreeze: true, coveredDayStartMs: missingDayStart };
};

export const nudgeUserStreakMutation = internalMutation({
	args: {
		userId: v.id('users'),
		now: v.optional(v.number()),
	},
	returns: v.object({
		usedFreeze: v.boolean(),
		coveredDayStartMs: v.optional(v.number()),
	}),
	handler: async (ctx, args) => {
		return await nudgeUserStreak({ ctx, args });
	},
});

// -----------------------------
// Streak Vacation status & purchase
// -----------------------------

export const getVacationStatus = query({
	args: {},
	returns: v.union(
		v.object({
			balance: v.number(),
			cost: v.number(),
			remainderTowardsNext: v.number(),
			percentTowardsNext: v.number(),
			totalExperience: v.number(),
			autoApplyHours: v.number(),
			moneyPriceUsd: v.number(),
			cap: v.number(),
			capped: v.boolean(),
		}),
		v.null()
	),
	handler: async ctx => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return null;

		const user = await ctx.db.get(userId);
		if (!user) return null;

		const currentTargetLanguageId = (user as any).currentTargetLanguageId as
			| Id<'userTargetLanguages'>
			| undefined;
		if (!currentTargetLanguageId) return null;

		const latest = (
			await ctx.db
				.query('userTargetLanguageExperienceLedgers')
				.withIndex('by_user_target_language', q =>
					q.eq('userTargetLanguageId', currentTargetLanguageId)
				)
				.order('desc')
				.take(1)
		)[0];

		const totalExperience = Math.max(0, latest?.runningTotalAfter ?? 0);
		const remainderTowardsNext = totalExperience % VACATION_COST;
		const percentTowardsNext = Math.max(
			0,
			Math.min(100, Math.floor((remainderTowardsNext / VACATION_COST) * 100))
		);
		const balance = await getVacationBalance(ctx, userId as any);
		const cap = VACATION_CAP;
		const capped = balance >= cap;

		return {
			balance,
			cost: VACATION_COST,
			remainderTowardsNext,
			percentTowardsNext: capped ? 100 : percentTowardsNext,
			totalExperience,
			autoApplyHours: 24,
			moneyPriceUsd: 2.99,
			cap,
			capped,
		} as any;
	},
});
