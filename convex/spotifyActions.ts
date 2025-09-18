"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

function getRedirectUri(): string {
    const convexBase = (process.env.CONVEX_SITE_URL || "").replace(/\/$/, "");

    return `${convexBase}/api/spotify/callback`;
}

export const finishAuth = internalAction({
    args: {
        state: v.string(),
        code: v.string(),
    },
    returns: v.object({ ok: v.boolean() }),
    handler: async (ctx, args) => {
        const row = await ctx.runQuery(internal.spotify.getAuthStateByState, { state: args.state });
        if (!row) throw new Error("Invalid state");
        const userId = row.userId as any;
        const clientId = process.env.SPOTIFY_CLIENT_ID as string | undefined;
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET as string | undefined;
        const redirectUri = getRedirectUri();
        if (!clientId || !clientSecret) throw new Error("Missing Spotify client credentials");
        const body = new URLSearchParams({
            grant_type: "authorization_code",
            code: args.code,
            redirect_uri: redirectUri,
        });
        const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
        const resp = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basic}` },
            body,
        });
        if (!resp.ok) {
            const errText = await resp.text().catch(() => "");
            throw new Error(`Spotify token exchange failed: ${resp.status} ${errText}`);
        }
        const json = (await resp.json()) as any;
        const accessToken: string = json.access_token;
        const refreshToken: string = json.refresh_token;
        const expiresIn: number = json.expires_in;
        const tokenType: string | undefined = json.token_type;
        const scope: string | undefined = json.scope;
        const expiresAt = Date.now() + Math.max(0, (expiresIn || 0) * 1000) - 30_000;

        // Fetch profile for display name and Spotify user id (best-effort)
        let spotifyUserId: string | undefined = undefined;
        let displayName: string | undefined = undefined;
        try {
            const meResp = await fetch("https://api.spotify.com/v1/me", {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (meResp.ok) {
                const me = (await meResp.json()) as any;
                spotifyUserId = me?.id;
                displayName = me?.display_name || me?.id || undefined;
            }
        } catch {}

        await ctx.runMutation(internal.spotify.upsertSpotifyAccount, {
            userId,
            spotifyUserId,
            displayName,
            accessToken,
            refreshToken,
            expiresAt,
            tokenType,
            scope,
        });
        try { await ctx.runMutation(internal.spotify.deleteAuthState, { id: row._id }); } catch {}
        return { ok: true } as const;
    },
});

export const refreshToken = internalAction({
    args: { userId: v.id("users") },
    returns: v.object({ ok: v.boolean() }),
    handler: async (ctx, args) => {
        const acct = await ctx.runQuery(internal.spotify.getAccountByUser, { userId: args.userId });
        if (!acct) return { ok: true } as const;
        if ((acct.expiresAt as number) > Date.now() + 60_000) return { ok: true } as const;
        const clientId = process.env.SPOTIFY_CLIENT_ID as string | undefined;
        const clientSecret = process.env.SPOTIFY_CLIENT_SECRET as string | undefined;
        if (!clientId || !clientSecret) return { ok: true } as const;
        const body = new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: (acct.refreshToken as string) || "",
        });
        const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
        const resp = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basic}` },
            body,
        });
        if (!resp.ok) return { ok: true } as const;
        const json = (await resp.json()) as any;
        const accessToken: string | undefined = json.access_token;
        const expiresIn: number | undefined = json.expires_in;
        if (accessToken) {
            await ctx.runMutation(internal.spotify.updateAccessToken, {
                id: acct._id,
                accessToken,
                expiresAt: Date.now() + Math.max(0, (expiresIn || 0) * 1000) - 30_000,
            });
        }
        return { ok: true } as const;
    },
});


