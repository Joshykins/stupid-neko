import { getAuthUserId } from '@convex-dev/auth/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import dayjs from '../lib/dayjs';

// Type guard to check if context has mutation capabilities
function isMutationCtx(ctx: QueryCtx | MutationCtx): ctx is MutationCtx {
	return 'patch' in ctx.db;
}

export function dangerousTestingEnabled(): boolean {
	return process.env.DANGEROUS_TESTING === 'enabled';
}

export function assertDangerousTestingEnabled(): void {
	if (!dangerousTestingEnabled()) {
		throw new Error('Dangerous testing is not enabled');
	}
}

export async function getEffectiveNow(
	ctx: QueryCtx | MutationCtx
): Promise<number> {
	if (!dangerousTestingEnabled()) return Date.now();
	const userId = await getAuthUserId(ctx).catch(() => null as any);
	if (!userId) return Date.now();
	const user = await ctx.db.get(userId);
	if (!user) return Date.now();
	const devDate = (user as any).devDate as number | undefined;

	// If devDate is set, preserve the day but use current time
	if (typeof devDate === 'number') {
		const now = Date.now();

		// Extract the day from devDate and time from current time using dayjs
		const devDateDayjs = dayjs(devDate);
		const nowDayjs = dayjs(now);

		// Create a new date with devDate's year/month/day but current time's hours/minutes/seconds
		const effectiveDate = devDateDayjs
			.hour(nowDayjs.hour())
			.minute(nowDayjs.minute())
			.second(nowDayjs.second())
			.millisecond(nowDayjs.millisecond());

		// If the effective date is significantly in the past (more than 1 hour), clear devDate
		// This prevents clearing devDate immediately when advancing time
		if (effectiveDate.isBefore(nowDayjs.subtract(1, 'hour'))) {
			// Only clear devDate if we're in a mutation context
			if (isMutationCtx(ctx)) {
				await ctx.db.patch(userId, { devDate: undefined } as any);
			}
			return now;
		}

		return effectiveDate.valueOf();
	}

	return Date.now();
}
