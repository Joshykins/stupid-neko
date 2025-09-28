import { httpRouter } from 'convex/server';
import { internal } from './_generated/api';
import { httpAction } from './_generated/server';
import { auth } from './auth';

const http = httpRouter();
auth.addHttpRoutes(http);

// Spotify OAuth callback
http.route({
	path: '/api/spotify/callback',
	method: 'GET',
	handler: httpAction(async (ctx, req) => {
		const url = new URL(req.url);
		const code = url.searchParams.get('code');
		const state = url.searchParams.get('state');
		const error = url.searchParams.get('error');
		if (error) {
			return new Response('Spotify authorization failed', { status: 400 });
		}
		if (!code || !state) {
			return new Response('Missing code or state', { status: 400 });
		}
		try {
			await ctx.runAction(internal.spotifyActions.finishAuth, { code, state });
			// Redirect back to site settings page
			const siteUrl = process.env.SITE_URL || process.env.VITE_SITE_URL || '';
			const redirect = `${siteUrl}/dashboard?spotify=connected`;
			return new Response(null, {
				status: 302,
				headers: { Location: redirect },
			});
		} catch (e) {
			return new Response('Failed to finalize Spotify auth', { status: 500 });
		}
	}),
});

export default http;
