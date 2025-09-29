import { v } from 'convex/values';
import { internal } from './_generated/api';
import { internalAction, internalMutation } from './_generated/server';

function getRedirectUri(): string {
	const convexBase = (process.env.CONVEX_SITE_URL || '').replace(/\/$/, '');

	return `${convexBase}/api/spotify/callback`;
}

export const finishAuth = internalAction({
	args: {
		state: v.string(),
		code: v.string(),
	},
	returns: v.object({ ok: v.boolean() }),
	handler: async (ctx, args): Promise<{ ok: boolean; }> => {
		const result = await ctx.runMutation(internal.spotifyActions.finishAuthMutation, {
			state: args.state,
			code: args.code,
		});
		return result;
	},
});

export const finishAuthMutation = internalMutation({
	args: {
		state: v.string(),
		code: v.string(),
	},
	returns: v.object({ ok: v.boolean() }),
	handler: async (ctx, args): Promise<{ ok: boolean; }> => {
		const row = await ctx.db
			.query('spotifyAuthStates')
			.withIndex('by_state', (q) => q.eq('state', args.state))
			.unique();
		if (!row) throw new Error('Invalid state');
		const userId = row.userId;

		const clientId = process.env.SPOTIFY_CLIENT_ID as string | undefined;
		const clientSecret = process.env.SPOTIFY_CLIENT_SECRET as string | undefined;
		const redirectUri = getRedirectUri();
		if (!clientId || !clientSecret)
			throw new Error('Missing Spotify client credentials');

		const body = new URLSearchParams({
			grant_type: 'authorization_code',
			code: args.code,
			redirect_uri: redirectUri,
		});
		const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
		const resp = await fetch('https://accounts.spotify.com/api/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${basic}`,
			},
			body,
		});
		if (!resp.ok) {
			const errText = await resp.text().catch(() => '');
			throw new Error(
				`Spotify token exchange failed: ${resp.status} ${errText}`
			);
		}
		const json = (await resp.json()) as any;
		const accessToken: string = json.access_token;
		const refreshToken: string = json.refresh_token;
		const expiresIn: number = json.expires_in;
		const tokenType: string | undefined = json.token_type;
		const scope: string | undefined = json.scope;
		const expiresAt =
			Date.now() + Math.max(0, (expiresIn || 0) * 1000) - 30_000;

		// Fetch profile for display name and Spotify user id (best-effort)
		let spotifyUserId: string | undefined;
		let displayName: string | undefined;
		const meResp = await fetch('https://api.spotify.com/v1/me', {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (meResp.ok) {
			const me = (await meResp.json()) as any;
			spotifyUserId = me?.id;
			displayName = me?.display_name || me?.id || undefined;
		}

		// Upsert Spotify account
		const existing = await ctx.db
			.query('spotifyAccounts')
			.withIndex('by_user', (q) => q.eq('userId', userId))
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, {
				spotifyUserId,
				displayName,
				accessToken,
				refreshToken,
				expiresAt,
				tokenType,
				scope,
			});
		} else {
			await ctx.db.insert('spotifyAccounts', {
				userId,
				spotifyUserId,
				displayName,
				accessToken,
				refreshToken,
				expiresAt,
				tokenType,
				scope,
			});
		}

		// Delete auth state
		await ctx.db.delete(row._id);

		return { ok: true };
	},
});

export const refreshToken = internalAction({
	args: { userId: v.id('users') },
	returns: v.object({ ok: v.boolean() }),
	handler: async (ctx, args): Promise<{ ok: boolean; }> => {
		const result = await ctx.runMutation(internal.spotifyActions.refreshTokenMutation, {
			userId: args.userId,
		});
		return result;
	},
});

export const refreshTokenMutation = internalMutation({
	args: { userId: v.id('users') },
	returns: v.object({ ok: v.boolean() }),
	handler: async (ctx, args): Promise<{ ok: boolean; }> => {
		const acct = await ctx.db
			.query('spotifyAccounts')
			.withIndex('by_user', (q) => q.eq('userId', args.userId))
			.unique();
		if (!acct) return { ok: true };
		if ((acct.expiresAt as number) > Date.now() + 60_000)
			return { ok: true };

		const clientId = process.env.SPOTIFY_CLIENT_ID as string | undefined;
		const clientSecret = process.env.SPOTIFY_CLIENT_SECRET as string | undefined;
		if (!clientId || !clientSecret) return { ok: true };

		const body = new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: (acct.refreshToken as string) || '',
		});
		const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
		const resp = await fetch('https://accounts.spotify.com/api/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${basic}`,
			},
			body,
		});
		if (!resp.ok) return { ok: true };

		const json = (await resp.json()) as any;
		const accessToken: string | undefined = json.access_token;
		const expiresIn: number | undefined = json.expires_in;
		if (accessToken) {
			await ctx.db.patch(acct._id, {
				accessToken,
				expiresAt: Date.now() + Math.max(0, (expiresIn || 0) * 1000) - 30_000,
			});
		}
		return { ok: true };
	},
});
