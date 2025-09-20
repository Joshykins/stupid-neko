import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export function dangerousTestingEnabled(): boolean {
	return process.env.DANGEROUS_TESTING === "enabled";
}

export function assertDangerousTestingEnabled(): void {
	if (!dangerousTestingEnabled()) {
		throw new Error("Dangerous testing is not enabled");
	}
}

export async function getEffectiveNow(
	ctx: QueryCtx | MutationCtx,
): Promise<number> {
	if (!dangerousTestingEnabled()) return Date.now();
	const userId = await getAuthUserId(ctx).catch(() => null as any);
	if (!userId) return Date.now();
	const user = await ctx.db.get(userId);
	if (!user) return Date.now();
	const devDate = (user as any).devDate as number | undefined;
	return typeof devDate === "number" ? devDate : Date.now();
}
