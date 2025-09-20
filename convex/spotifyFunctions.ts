import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
	action,
	httpAction,
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";

// Utilities
function encodeQuery(
	params: Record<string, string | number | undefined>,
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
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("");
		}
	} catch {}
	// Fallback: time + random
	return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function getRedirectUri(): string {
	const explicit = process.env.SPOTIFY_REDIRECT_URL;
	if (explicit && explicit.trim()) return explicit.trim();
	const convexBase = (process.env.CONVEX_SITE_URL || "").replace(/\/$/, "");

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
		if (!userId) throw new Error("Unauthorized");
		const state = generateState();
		await ctx.db.insert("spotifyAuthStates", {
			state,
			userId,
			createdAt: Date.now(),
			redirectTo: args.redirectTo,
		});
		const clientId = process.env.SPOTIFY_CLIENT_ID as string | undefined;
		if (!clientId) throw new Error("Missing SPOTIFY_CLIENT_ID");
		const redirectUri = getRedirectUri();
		const scope = [
			"user-read-currently-playing",
			"user-read-playback-state",
			"user-read-recently-played",
		].join(" ");
		const url = `https://accounts.spotifyFunctions.com/authorize?${encodeQuery({
			client_id: clientId,
			response_type: "code",
			redirect_uri: redirectUri,
			scope,
			state,
		})}`;
		return { url, state } as const;
	},
});

// Finish OAuth via HTTP callback handler in http.ts; we split exchange logic here.
// Helper: look up and manage state rows
export const getAuthStateByState = internalQuery({
	args: { state: v.string() },
	returns: v.union(
		v.object({
			_id: v.id("spotifyAuthStates"),
			state: v.string(),
			userId: v.id("users"),
			createdAt: v.number(),
			redirectTo: v.optional(v.string()),
		}),
		v.null(),
	),
	handler: async (ctx, args) => {
		const row = await ctx.db
			.query("spotifyAuthStates")
			.withIndex("by_state", (q: any) => q.eq("state", args.state))
			.unique();
		if (!row) return null;
		return {
			_id: row._id,
			state: row.state,
			userId: row.userId,
			createdAt: row.createdAt,
			redirectTo: row.redirectTo,
		} as any;
	},
});

export const deleteAuthState = internalMutation({
	args: { id: v.id("spotifyAuthStates") },
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.delete(args.id);
		return null;
	},
});

export const upsertSpotifyAccount = internalMutation({
	args: {
		userId: v.id("users"),
		spotifyUserId: v.optional(v.string()),
		displayName: v.optional(v.string()),
		accessToken: v.string(),
		refreshToken: v.string(),
		expiresAt: v.number(),
		tokenType: v.optional(v.string()),
		scope: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("spotifyAccounts")
			.withIndex("by_user", (q: any) => q.eq("userId", args.userId))
			.unique();
		if (existing) {
			await ctx.db.patch(existing._id, {
				accessToken: args.accessToken,
				refreshToken: args.refreshToken,
				expiresAt: args.expiresAt,
				tokenType: args.tokenType,
				scope: args.scope,
				spotifyUserId: args.spotifyUserId,
				displayName: args.displayName,
				status: "connected",
				updatedAt: Date.now(),
			} as any);
		} else {
			await ctx.db.insert("spotifyAccounts", {
				userId: args.userId,
				spotifyUserId: args.spotifyUserId,
				displayName: args.displayName,
				accessToken: args.accessToken,
				refreshToken: args.refreshToken,
				expiresAt: args.expiresAt,
				tokenType: args.tokenType,
				scope: args.scope,
				status: "connected",
				createdAt: Date.now(),
				updatedAt: Date.now(),
			} as any);
		}
		return null;
	},
});

// finishAuth moved to convex/spotifyActions.ts (Node runtime)

export const getStatus = query({
	args: {},
	returns: v.object({
		connected: v.boolean(),
		displayName: v.optional(v.string()),
	}),
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx).catch(() => null as any);
		if (!userId) return { connected: false } as const;
		const acct = await ctx.db
			.query("spotifyAccounts")
			.withIndex("by_user", (q: any) => q.eq("userId", userId))
			.unique();
		return { connected: !!acct, displayName: acct?.displayName } as const;
	},
});

export const disconnect = mutation({
	args: {},
	returns: v.object({ ok: v.boolean() }),
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Unauthorized");
		const acct = await ctx.db
			.query("spotifyAccounts")
			.withIndex("by_user", (q: any) => q.eq("userId", userId))
			.unique();
		if (acct) {
			await ctx.db.delete(acct._id);
		}
		return { ok: true } as const;
	},
});

// refreshToken moved to convex/spotifyActions.ts (Node runtime)

export const getAccountByUser = internalQuery({
	args: { userId: v.id("users") },
	returns: v.union(
		v.object({
			_id: v.id("spotifyAccounts"),
			userId: v.id("users"),
			accessToken: v.string(),
			refreshToken: v.string(),
			expiresAt: v.number(),
		}),
		v.null(),
	),
	handler: async (ctx, args) => {
		return await ctx.db
			.query("spotifyAccounts")
			.withIndex("by_user", (q: any) => q.eq("userId", args.userId))
			.unique();
	},
});

export const updateAccessToken = internalMutation({
	args: {
		id: v.id("spotifyAccounts"),
		accessToken: v.string(),
		expiresAt: v.number(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.id, {
			accessToken: args.accessToken,
			expiresAt: args.expiresAt,
			updatedAt: Date.now(),
		} as any);
		return null;
	},
});
