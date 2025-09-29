import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import {
	action,
	httpAction,
	internalMutation,
	internalQuery,
	mutation,
	query,
} from './_generated/server';
import { Id } from './_generated/dataModel';

// Utilities
function encodeQuery(
	params: Record<string, string | number | undefined>
): string {
	const search = new URLSearchParams();
	for (const [k, v] of Object.entries(params)) {
		if (v == null) continue;
		search.set(k, String(v));
	}
	return search.toString();
}

function generateState(): string {
	try {
		// Prefer Web Crypto if available in this runtime
		const g: any = globalThis as any;
		const cryptoObj = g?.crypto;
		if (cryptoObj?.getRandomValues) {
			const arr = new Uint8Array(16);
			cryptoObj.getRandomValues(arr);
			return Array.from(arr)
				.map(b => b.toString(16).padStart(2, '0'))
				.join('');
		}
	} catch {}
	// Fallback: time + random
	return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getRedirectUri(): string {
	const explicit = process.env.SPOTIFY_REDIRECT_URL;
	if (explicit && explicit.trim()) return explicit.trim();
	const convexBase = (process.env.CONVEX_SITE_URL || '').replace(/\/$/, '');

	return `${convexBase}/api/spotify/callback`;
}

// Start OAuth: create a state row and return the Spotify authorize URL
export const startAuth = mutation({
	args: {
		redirectTo: v.optional(v.string()),
	},
	returns: v.object({ url: v.string(), state: v.string() }),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error('Unauthorized');
		const state = generateState();
		await ctx.db.insert('spotifyAuthStates', {
			state,
			userId,
			createdAt: Date.now(),
			redirectTo: args.redirectTo,
		});
		const clientId = process.env.SPOTIFY_CLIENT_ID as string | undefined;
		if (!clientId) throw new Error('Missing SPOTIFY_CLIENT_ID');
		const redirectUri = getRedirectUri();
		const scope = [
			'user-read-currently-playing',
			'user-read-playback-state',
			'user-read-recently-played',
		].join(' ');
		const url = `https://accounts.spotify.com/authorize?${encodeQuery({
			client_id: clientId,
			response_type: 'code',
			redirect_uri: redirectUri,
			scope,
			state,
		})}`;
		return { url, state } as const;
	},
});




// finishAuth moved to convex/spotifyActions.ts (Node runtime)

export const getStatus = query({
	args: {},
	returns: v.object({
		connected: v.boolean(),
		displayName: v.optional(v.string()),
	}),
	handler: async ctx => {
		const userId = await getAuthUserId(ctx).catch(() => null as any);
		if (!userId) return { connected: false } as const;
		const acct = await ctx.db
			.query('spotifyAccounts')
			.withIndex('by_user', q => q.eq('userId', userId))
			.unique();
		return { connected: !!acct, displayName: acct?.displayName } as const;
	},
});

export const disconnect = mutation({
	args: {},
	returns: v.object({ ok: v.boolean() }),
	handler: async ctx => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error('Unauthorized');
		const acct = await ctx.db
			.query('spotifyAccounts')
			.withIndex('by_user', q => q.eq('userId', userId))
			.unique();
		if (acct) {
			await ctx.db.delete(acct._id);
		}
		return { ok: true } as const;
	},
});