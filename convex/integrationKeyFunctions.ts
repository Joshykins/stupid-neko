import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import {
	internalMutation,
	internalQuery,
	mutation,
	query,
} from './_generated/server';
// Use Web Crypto (available in Convex runtime) to generate random IDs

export function generateIntegrationKey(): string {
	const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);
	// Hex encoding: URL-safe and no globals required
	const hex = Array.from(bytes)
		.map(b => b.toString(16).padStart(2, '0'))
		.join('');
	return `sn_int_${hex}`;
}

export const regenerateIntegrationKey = mutation({
	args: {},
	returns: v.object({ integrationId: v.string() }),
	handler: async ctx => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error('Unauthorized');
		const user = await ctx.db.get(userId);
		if (!user) throw new Error('User not found');
		const integrationId = generateIntegrationKey();
		await ctx.db.patch(userId, {
			integrationKey: integrationId,
			integrationKeyUsedByPlugin: false,
		});
		return { integrationId };
	},
});

export const getIntegrationKey = query({
	args: {},
	returns: v.union(
		v.object({
			integrationId: v.string(),
			integrationKeyUsedByPlugin: v.optional(v.boolean()),
		}),
		v.null()
	),
	handler: async ctx => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error('Unauthorized');
		const user = await ctx.db.get(userId);
		if (!user) throw new Error('User not found');
		const integrationId = user.integrationKey;
		return integrationId
			? {
					integrationId,
					integrationKeyUsedByPlugin: user.integrationKeyUsedByPlugin,
				}
			: null;
	},
});

export const clearIntegrationKey = mutation({
	args: {},
	returns: v.null(),
	handler: async ctx => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error('Unauthorized');
		await ctx.db.patch(userId, {
			integrationKey: undefined,
			integrationKeyUsedByPlugin: undefined,
		});
		return null;
	},
});

export const getUserByIntegrationKey = internalQuery({
	args: { integrationId: v.string() },
	returns: v.union(v.any(), v.null()),
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_integration_key', q =>
				q.eq('integrationKey', args.integrationId)
			)
			.unique();
		return user;
	},
});

export const markIntegrationKeyAsUsed = internalMutation({
	args: { integrationId: v.string() },
	returns: v.null(),
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_integration_key', q =>
				q.eq('integrationKey', args.integrationId)
			)
			.unique();
		if (!user) return null;
		await ctx.db.patch(user._id, { integrationKeyUsedByPlugin: true });
		return null;
	},
});
