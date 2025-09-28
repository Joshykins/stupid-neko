import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { query } from './_generated/server';
import { getEffectiveNow } from './utils';

const DAY_MS = 24 * 60 * 60 * 1000;
function dayStartMsOf(timestampMs: number): number {
	return Math.floor(timestampMs / DAY_MS) * DAY_MS;
}

export const getXpTimeseries = query({
	args: {
		range: v.union(v.literal('7d'), v.literal('30d'), v.literal('all')),
	},
	returns: v.object({
		points: v.array(
			v.object({
				dayStartMs: v.number(),
				xp: v.number(),
			})
		),
		totalXp: v.number(),
		days: v.number(),
		now: v.number(),
		startInclusive: v.number(),
	}),
	handler: async (ctx, args) => {
		// Determine window (respect devDate when testing)
		const days = args.range === '7d' ? 7 : args.range === '30d' ? 30 : 365; // cap all-time at 1 year for perf
		const now = await getEffectiveNow(ctx);
		const startInclusive = dayStartMsOf(now - (days - 1) * DAY_MS);

		const userId = await getAuthUserId(ctx);
		if (!userId) {
			const emptyPoints: Array<{ dayStartMs: number; xp: number }> = [];
			return { points: emptyPoints, totalXp: 0, days, now, startInclusive };
		}

		const user = await ctx.db.get(userId);
		if (!user) {
			const emptyPoints: Array<{ dayStartMs: number; xp: number }> = [];
			return { points: emptyPoints, totalXp: 0, days, now, startInclusive };
		}

		// Prefer current target language if available for better relevance
		const currentTargetLanguageId = (user as any).currentTargetLanguageId;

		let events: Array<any> = [];
		if (currentTargetLanguageId) {
			// Filter by userTargetLanguageId for specificity
			const q = ctx.db
				.query('userTargetLanguageExperienceLedgers')
				.withIndex('by_user_target_language', (q: any) =>
					q.eq('userTargetLanguageId', currentTargetLanguageId)
				);
			const rows = await q.collect();
			events = rows;
		} else {
			// Fallback: all XP for the user
			const q = ctx.db
				.query('userTargetLanguageExperienceLedgers')
				.withIndex('by_user', (q: any) => q.eq('userId', userId));
			const rows = await q.collect();
			events = rows;
		}

		// Bucket by day and limit window
		const bucket = new Map<number, number>();
		for (const e of events) {
			const t: number | undefined = (e as any).occurredAt ?? undefined;
			const day = dayStartMsOf(typeof t === 'number' ? t : now);
			if (day < startInclusive) continue;
			const dx = Math.max(0, Math.floor((e as any).deltaExperience ?? 0));
			bucket.set(day, (bucket.get(day) ?? 0) + dx);
		}

		// Ensure we return a contiguous series (0s for missing days)
		const points: Array<{ dayStartMs: number; xp: number }> = [];
		for (let i = 0; i < days; i++) {
			const d = startInclusive + i * DAY_MS;
			points.push({
				dayStartMs: d,
				xp: Math.max(0, Math.floor(bucket.get(d) ?? 0)),
			});
		}

		const totalXp = points.reduce((s, p) => s + p.xp, 0);
		return { points, totalXp, days, now, startInclusive };
	},
});
