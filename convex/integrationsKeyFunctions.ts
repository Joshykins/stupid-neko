import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
// Use Web Crypto (available in Convex runtime) to generate random IDs

export function generateIntegrationId(): string {
	const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);
	// Hex encoding: URL-safe and no globals required
	const hex = Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return `sn_int_${hex}`;
}

export const regenerateIntegrationKey = mutation({
	args: {},
	returns: v.object({ integrationId: v.string() }),
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Unauthorized");
		const user = await ctx.db.get(userId);
		if (!user) throw new Error("User not found");
		const integrationId = generateIntegrationId();
		await ctx.db.patch(userId, { integrationKey: integrationId } as any);
		return { integrationId };
	},
});

export const getIntegrationKey = query({
	args: {},
	returns: v.union(v.object({ integrationId: v.string() }), v.null()),
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Unauthorized");
		const user = await ctx.db.get(userId);
		if (!user) throw new Error("User not found");
		const integrationId = (user as any).integrationKey as string | undefined;
		return integrationId ? { integrationId } : null;
	},
});

export const clearIntegrationKey = mutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Unauthorized");
		await ctx.db.patch(userId, { integrationKey: undefined } as any);
		return null;
	},
});

export const getUserByIntegrationId = internalQuery({
	args: { integrationId: v.string() },
	returns: v.union(v.object({ userId: v.id("users") }), v.null()),
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_integration_key", (q: any) => q.eq("integrationKey", args.integrationId))
			.unique();
		if (!user) return null;
		return { userId: (user as any)._id } as any;
	},
});

export const touchIntegrationId = internalMutation({
	args: { integrationId: v.string() },
	returns: v.null(),
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_integration_key", (q: any) => q.eq("integrationKey", args.integrationId))
			.unique();
		if (!user) return null;
		// No-op for now
		return null;
	},
});


