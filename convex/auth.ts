import Discord from '@auth/core/providers/discord';
import Google from '@auth/core/providers/google';
import { convexAuth } from '@convex-dev/auth/server';
import { generateIntegrationKey } from './integrationKeyFunctions';
import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
	providers: [
		Google({
			clientId: process.env.AUTH_GOOGLE_ID as string,
			clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
			async profile(profile: any) {
				return {
					id: profile.sub,
					name: profile.name ?? undefined,
					email: profile.email ?? undefined,
					image: profile.picture ?? undefined,
				};
			},
		}),
		Discord({
			clientId: process.env.AUTH_DISCORD_ID as string,
			clientSecret: process.env.AUTH_DISCORD_SECRET as string,
			async profile(profile: any) {
				// Discord avatar URL
				// If no avatar, use default avatar based on discriminator/id
				const base = 'https://cdn.discordapp.com';
				let image: string | undefined;
				if (profile.avatar) {
					image = `${base}/avatars/${profile.id}/${profile.avatar}.png`;
				} else if (profile.id) {
					// Use modulo operation on the numeric ID instead of BigInt
					const discriminator = (parseInt(profile.id) % 5).toString();
					image = `${base}/embed/avatars/${discriminator}.png`;
				}
				return {
					id: String(profile.id),
					name: profile.global_name ?? profile.username ?? undefined,
					email: profile.email ?? undefined,
					image,
				};
			},
		}),
	],
	callbacks: {
		async createOrUpdateUser(ctx: MutationCtx, args) {
			const email = args.profile?.email as string | undefined;

			let existingUserId: Id<'users'> | null = args.existingUserId ?? null;
			// Prefer linking by email if present
			if (!existingUserId && email) {
				const existing = await ctx.db
					.query('users')
					.withIndex('by_email', q => q.eq('email', email))
					.take(2);
				if (existing.length === 1) {
					existingUserId = existing[0]._id;

					if (args.type === 'credentials') {
						const oauthAccounts = await ctx.db
							.query('authAccounts')
							.withIndex('userIdAndProvider', q =>
								q.eq('userId', existingUserId!)
							)
							.filter(q => q.neq(q.field('provider'), 'password'))
							.take(1);
						if (oauthAccounts.length > 0) {
							console.log('authcallback 4');
							throw new Error(
								'An account already exists for this email. Please sign in with Google or Discord.'
							);
						}
					}
				}
			}
			// If an OAuth account already exists, delete the password account
			if (
				existingUserId &&
				(args.type === 'oauth' || args.provider?.type === 'oauth')
			) {
				const pwAccounts = await ctx.db
					.query('authAccounts')
					.withIndex('userIdAndProvider', q => q.eq('userId', existingUserId!))
					.filter(q => q.eq(q.field('provider'), 'password'))
					.collect();
				for (const acc of pwAccounts) {
					await ctx.db.delete(acc._id);
				}
			}

			if (!existingUserId) {
				const profile = args.profile;
				existingUserId = await ctx.db.insert('users', {
					name: profile?.name as string | undefined,
					email: profile?.email,
					image: profile?.image as string | undefined,
					integrationKey: generateIntegrationKey(),
				});
			}

			return existingUserId!;
		},
	},
});
