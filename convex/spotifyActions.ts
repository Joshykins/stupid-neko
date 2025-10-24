import { v } from 'convex/values';
import { internal } from './_generated/api';
import {
	internalAction,
	internalMutation,
	internalQuery,
} from './_generated/server';
import { tryCatch } from '../lib/tryCatch';
import { recordContentActivity } from './labelingEngine/contentActivityFunctions';

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
	handler: async (ctx, args): Promise<{ ok: boolean }> => {
		const result = await ctx.runMutation(
			internal.spotifyActions.finishAuthMutation,
			{
				state: args.state,
				code: args.code,
			}
		);
		return result;
	},
});

export const finishAuthMutation = internalMutation({
	args: {
		state: v.string(),
		code: v.string(),
	},
	returns: v.object({ ok: v.boolean() }),
	handler: async (ctx, args): Promise<{ ok: boolean }> => {
		const row = await ctx.db
			.query('spotifyAuthStates')
			.withIndex('by_state', q => q.eq('state', args.state))
			.unique();
		if (!row) throw new Error('Invalid state');
		const userId = row.userId;

		const clientId = process.env.SPOTIFY_CLIENT_ID as string | undefined;
		const clientSecret = process.env.SPOTIFY_CLIENT_SECRET as
			| string
			| undefined;
		const redirectUri = getRedirectUri();
		if (!clientId || !clientSecret)
			throw new Error('Missing Spotify client credentials');

		const body = new URLSearchParams({
			grant_type: 'authorization_code',
			code: args.code,
			redirect_uri: redirectUri,
		});
		const basic = btoa(`${clientId}:${clientSecret}`);
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
			.withIndex('by_user', q => q.eq('userId', userId))
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
	handler: async (ctx, args): Promise<{ ok: boolean }> => {
		// Get the account info first
		const account = await ctx.runQuery(
			internal.spotifyActions.getSpotifyAccount,
			{ userId: args.userId }
		);
		if (!account) return { ok: true };
		if (account.expiresAt > Date.now() + 60_000) return { ok: true };

		const clientId = process.env.SPOTIFY_CLIENT_ID as string | undefined;
		const clientSecret = process.env.SPOTIFY_CLIENT_SECRET as
			| string
			| undefined;
		if (!clientId || !clientSecret) return { ok: true };

		const body = new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: account.refreshToken,
		});
		const basic = btoa(`${clientId}:${clientSecret}`);

		const { data: resp, error: fetchError } = await tryCatch(
			fetch('https://accounts.spotify.com/api/token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization: `Basic ${basic}`,
				},
				body,
			})
		);

		if (fetchError || !resp || !resp.ok) {
			console.debug('[spotifyActions.refreshToken] token refresh failed', {
				userId: args.userId,
				status: resp?.status,
				error: fetchError?.message,
			});
			return { ok: false };
		}

		const { data: json, error: jsonError } = await tryCatch(resp.json());
		if (jsonError) {
			console.debug('[spotifyActions.refreshToken] JSON parse failed', {
				userId: args.userId,
				error: jsonError.message,
			});
			return { ok: false };
		}

		const accessToken: string | undefined = json.access_token;
		const refreshToken: string | undefined = json.refresh_token; // New refresh token (optional)
		const expiresIn: number | undefined = json.expires_in;
		const scope: string | undefined = json.scope;

		if (accessToken) {
			// Update the account with new tokens using a mutation
			await ctx.runMutation(internal.spotifyActions.updateSpotifyTokens, {
				userId: args.userId,
				accessToken,
				refreshToken,
				expiresIn,
				scope,
			});

			console.debug(
				'[spotifyActions.refreshToken] token refreshed successfully',
				{
					userId: args.userId,
					newRefreshToken: !!refreshToken,
				}
			);
		} else {
			console.debug(
				'[spotifyActions.refreshToken] no access token in response',
				{
					userId: args.userId,
					response: json,
				}
			);
			return { ok: false };
		}

		return { ok: true };
	},
});

export const updateSpotifyTokens = internalMutation({
	args: {
		userId: v.id('users'),
		accessToken: v.string(),
		refreshToken: v.optional(v.string()),
		expiresIn: v.optional(v.number()),
		scope: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const acct = await ctx.db
			.query('spotifyAccounts')
			.withIndex('by_user', q => q.eq('userId', args.userId))
			.unique();

		if (!acct) return null;

		const updateData: any = {
			accessToken: args.accessToken,
			expiresAt:
				Date.now() + Math.max(0, (args.expiresIn || 0) * 1000) - 30_000,
		};

		// Only update refresh token if a new one was provided
		if (args.refreshToken) {
			updateData.refreshToken = args.refreshToken;
		}

		// Update scope if provided
		if (args.scope) {
			updateData.scope = args.scope;
		}

		await ctx.db.patch(acct._id, updateData);
		return null;
	},
});

/**
 * Poll all users with Spotify accounts for currently playing tracks
 * This is called by the cron job every 60 seconds
 */
export const pollAllUsers = internalAction({
	args: {},
	returns: v.object({
		processed: v.number(),
		errors: v.number(),
		skipped: v.number(),
	}),
	handler: async (
		ctx
	): Promise<{ processed: number; errors: number; skipped: number }> => {
		console.debug('[spotifyActions.pollAllUsers] starting');

		// Get all Spotify accounts with valid tokens
		const accounts = await ctx.runQuery(
			internal.spotifyActions.getActiveSpotifyAccounts,
			{}
		);

		let processed = 0;
		let errors = 0;
		let skipped = 0;

		for (const account of accounts) {
			try {
				const result = await ctx.runAction(
					internal.spotifyActions.pollUserSpotify,
					{ userId: account.userId }
				);
				if (result.success) {
					processed++;
				} else if (result.skipped) {
					skipped++;
				} else {
					errors++;
				}
			} catch (error) {
				console.error('[spotifyActions.pollAllUsers] error for user', {
					userId: account.userId,
					error: error instanceof Error ? error.message : String(error),
				});
				errors++;
			}
		}

		console.debug('[spotifyActions.pollAllUsers] completed', {
			processed,
			errors,
			skipped,
			total: accounts.length,
		});

		return { processed, errors, skipped };
	},
});

/**
 * Get all active Spotify accounts that should be polled
 */
export const getActiveSpotifyAccounts = internalQuery({
	args: {},
	returns: v.array(
		v.object({
			userId: v.id('users'),
			spotifyUserId: v.optional(v.string()),
			displayName: v.optional(v.string()),
		})
	),
	handler: async ctx => {
		// Get all Spotify accounts that have valid tokens
		const accounts = await ctx.db
			.query('spotifyAccounts')
			.filter(q =>
				q.and(
					q.neq(q.field('accessToken'), ''),
					q.neq(q.field('refreshToken'), '')
				)
			)
			.collect();

		return accounts.map(account => ({
			userId: account.userId,
			spotifyUserId: account.spotifyUserId,
			displayName: account.displayName,
		}));
	},
});

/**
 * Poll a specific user's Spotify for currently playing track
 */
export const pollUserSpotify = internalAction({
	args: {
		userId: v.id('users'),
	},
	returns: v.object({
		success: v.boolean(),
		skipped: v.boolean(),
		error: v.optional(v.string()),
	}),
	handler: async (
		ctx,
		args
	): Promise<{ success: boolean; skipped: boolean; error?: string }> => {
		console.debug('[spotifyActions.pollUserSpotify] starting', {
			userId: args.userId,
		});

		try {
			// Refresh token if needed
			const { data: refreshResult, error: refreshError } = await tryCatch(
				ctx.runAction(internal.spotifyActions.refreshToken, {
					userId: args.userId,
				})
			);

			if (refreshError || !refreshResult?.ok) {
				console.debug('[spotifyActions.pollUserSpotify] token refresh failed', {
					userId: args.userId,
					error: refreshError?.message,
				});
				return { success: false, skipped: true, error: 'Token refresh failed' };
			}

			// Get the user's Spotify account
			const account = await ctx.runQuery(
				internal.spotifyActions.getSpotifyAccount,
				{ userId: args.userId }
			);
			if (!account) {
				return {
					success: false,
					skipped: true,
					error: 'No Spotify account found',
				};
			}

			// Call Spotify API to get currently playing track/episode
			// Include additional_types=episode to get podcast episode data
			const { data: spotifyResponse, error: spotifyError } = await tryCatch(
				fetch(
					'https://api.spotify.com/v1/me/player/currently-playing?additional_types=episode',
					{
						headers: {
							Authorization: `Bearer ${account.accessToken}`,
							'Content-Type': 'application/json',
						},
					}
				)
			);

			if (spotifyError) {
				console.debug('[spotifyActions.pollUserSpotify] Spotify API error', {
					userId: args.userId,
					error: spotifyError.message,
				});
				return { success: false, skipped: true, error: spotifyError.message };
			}

			if (!spotifyResponse || !spotifyResponse.ok) {
				if (spotifyResponse?.status === 204) {
					// No content playing - this is normal
					return { success: true, skipped: true };
				}
				if (spotifyResponse?.status === 401) {
					// Token expired - mark account as needing refresh
					console.debug('[spotifyActions.pollUserSpotify] token expired', {
						userId: args.userId,
					});
					return { success: false, skipped: true, error: 'Token expired' };
				}
				if (spotifyResponse?.status === 403) {
					// Forbidden - user may not be registered or app configuration issue
					console.debug(
						'[spotifyActions.pollUserSpotify] forbidden - check Spotify app settings',
						{
							userId: args.userId,
							status: spotifyResponse.status,
						}
					);
					return {
						success: false,
						skipped: true,
						error:
							'Spotify app configuration issue - check developer dashboard',
					};
				}
				if (spotifyResponse?.status === 429) {
					// Rate limited - skip this user for now
					console.debug('[spotifyActions.pollUserSpotify] rate limited', {
						userId: args.userId,
					});
					return { success: false, skipped: true, error: 'Rate limited' };
				}

				const errorText = await spotifyResponse
					?.text()
					.catch(() => 'Unknown error');
				console.debug('[spotifyActions.pollUserSpotify] Spotify API error', {
					userId: args.userId,
					status: spotifyResponse?.status,
					error: errorText,
				});
				return {
					success: false,
					skipped: true,
					error: `Spotify API error: ${spotifyResponse?.status}`,
				};
			}

			const { data: trackData, error: jsonError } = await tryCatch(
				spotifyResponse.json()
			);
			if (jsonError) {
				console.debug('[spotifyActions.pollUserSpotify] JSON parse error', {
					userId: args.userId,
					error: jsonError.message,
				});
				return { success: false, skipped: true, error: jsonError.message };
			}

			// Log the full response for debugging
			console.debug('[spotifyActions.pollUserSpotify] Spotify API response', {
				userId: args.userId,
				isPlaying: trackData?.is_playing,
				hasItem: !!trackData?.item,
				itemType: trackData?.item?.type,
				itemName: trackData?.item?.name,
				progress: trackData?.progress_ms,
				device: trackData?.device?.name,
			});

			// Check if something is actually playing
			if (!trackData?.is_playing) {
				console.debug('[spotifyActions.pollUserSpotify] not playing', {
					userId: args.userId,
					isPlaying: trackData?.is_playing,
				});
				return { success: true, skipped: true };
			}

			// If playing but no item, this might be unsupported content type
			if (!trackData?.item) {
				console.debug(
					'[spotifyActions.pollUserSpotify] playing but no item (unsupported content type)',
					{
						userId: args.userId,
						isPlaying: trackData?.is_playing,
						progress: trackData?.progress_ms,
						device: trackData?.device?.name,
					}
				);
				return { success: true, skipped: true };
			}

			const track = trackData.item;
			const trackId = track.id;
			const trackName = track.name;

			// Handle both music tracks and podcast episodes
			let artists: string;
			let album: string;

			if (track.type === 'episode') {
				// Podcast episode
				artists = track.show?.name || 'Unknown Show';
				album = track.show?.name || 'Unknown Show';
			} else {
				// Music track
				artists =
					track.artists?.map((artist: any) => artist.name).join(', ') ||
					'Unknown Artist';
				album = track.album?.name || 'Unknown Album';
			}

			const duration = track.duration_ms || 0;
			const progress = trackData.progress_ms || 0;
			const trackUrl =
				track.external_urls?.spotify ||
				`https://open.spotify.com/track/${trackId}`;

			console.debug('[spotifyActions.pollUserSpotify] found playing track', {
				userId: args.userId,
				trackId,
				trackName,
				artists,
				album,
				progress,
				duration,
				type: track.type,
			});

			// Create content key
			const contentKey = `spotify:${trackId}`;

			// Record the activity
			const { data: result, error: recordError } = await tryCatch(
				ctx.runMutation(internal.spotifyActions.recordSpotifyActivity, {
					userId: args.userId,
					contentKey,
					contentUrl: trackUrl,
					trackName,
					artists,
					album,
					duration,
					progress,
				})
			);

			if (recordError) {
				console.error(
					'[spotifyActions.pollUserSpotify] failed to record activity',
					{
						userId: args.userId,
						error: recordError.message,
					}
				);
				return { success: false, skipped: false, error: recordError.message };
			}

			console.debug('[spotifyActions.pollUserSpotify] recorded activity', {
				userId: args.userId,
				contentKey,
				activityId: result?.languageActivityId,
			});

			return { success: true, skipped: false };
		} catch (error) {
			console.error('[spotifyActions.pollUserSpotify] unexpected error', {
				userId: args.userId,
				error: error instanceof Error ? error.message : String(error),
			});
			return {
				success: false,
				skipped: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			};
		}
	},
});

/**
 * Get a user's Spotify account
 */
export const getSpotifyAccount = internalQuery({
	args: {
		userId: v.id('users'),
	},
	returns: v.union(
		v.object({
			accessToken: v.string(),
			refreshToken: v.string(),
			expiresAt: v.number(),
		}),
		v.null()
	),
	handler: async (ctx, args) => {
		const account = await ctx.db
			.query('spotifyAccounts')
			.withIndex('by_user', q => q.eq('userId', args.userId))
			.unique();

		if (!account) return null;

		return {
			accessToken: account.accessToken,
			refreshToken: account.refreshToken,
			expiresAt: account.expiresAt,
		};
	},
});

/**
 * Record a Spotify activity
 */
export const recordSpotifyActivity = internalMutation({
	args: {
		userId: v.id('users'),
		contentKey: v.string(),
		contentUrl: v.string(),
		trackName: v.string(),
		artists: v.string(),
		album: v.string(),
		duration: v.number(),
		progress: v.number(),
	},
	returns: v.object({
		languageActivityId: v.optional(v.id('userTargetLanguageActivities')),
		contentLabelId: v.optional(v.id('contentLabels')),
		isWaitingOnLabeling: v.optional(v.boolean()),
	}),
	handler: async (ctx, args) => {
		// Record the content activity using the existing system
		const result = await recordContentActivity({
			ctx,
			args: {
				userId: args.userId,
				source: 'spotify',
				activityType: 'heartbeat',
				contentKey: args.contentKey,
				url: args.contentUrl,
				occurredAt: Date.now(),
			},
		});

		// If a content label was created, update it with track metadata
		if (result.contentLabelId) {
			await ctx.db.patch(result.contentLabelId, {
				title: args.trackName,
				authorName: args.artists,
				description: `${args.trackName} by ${args.artists} from ${args.album}`,
				thumbnailUrl: undefined, // We don't have album art URL from the currently playing endpoint
				fullDurationInMs: args.duration,
				contentUrl: args.contentUrl,
			});
		}

		return {
			languageActivityId: result.languageActivityId,
			contentLabelId: result.contentLabelId,
			isWaitingOnLabeling: result.isWaitingOnLabeling,
		};
	},
});
