import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import Google from "@auth/core/providers/google";
import Discord from "@auth/core/providers/discord";
import { generateIntegrationId } from "./integrationsKeyFunctions";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password(),
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
        const base = "https://cdn.discordapp.com";
        let image: string | undefined = undefined;
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
    async createOrUpdateUser(ctx, args) {
      const email = (args.profile as any)?.email as string | undefined;

      let existingUserId: any = args.existingUserId ?? null;
      const db: any = ctx.db as any;
      // Prefer linking by email if present
      if (!existingUserId && email) {
        const existing = await db.query("users").withIndex("email", (q: any) => q.eq("email", email)).take(2);
        if (existing.length === 1) {
          existingUserId = existing[0]._id;
          if (args.type === "credentials") {
            const oauthAccounts = await db
              .query("authAccounts")
              .withIndex("userIdAndProvider", (q: any) => q.eq("userId", existingUserId))
              .filter((q: any) => q.neq(q.field("provider"), "password"))
              .take(1);
            if (oauthAccounts.length > 0) {
              console.log("authcallback 4")
              throw new Error(
                "An account already exists for this email. Please sign in with Google or Discord.",
              );
            }
          }
        }
      }
      // If an OAuth account already exists, delete the password account
      if (existingUserId && (args.type === "oauth" || (args as any).provider?.type === "oauth")) {
        const pwAccounts = await db
          .query("authAccounts")
          .withIndex("userIdAndProvider", (q: any) => q.eq("userId", existingUserId))
          .filter((q: any) => q.eq(q.field("provider"), "password"))
          .collect();
        for (const acc of pwAccounts) {
          await db.delete(acc._id);
        }
      }

      if (!existingUserId) {
        const profile = (args.profile as any) ?? {};
        existingUserId = await (db as any).insert("users", {
          name: profile.name ?? undefined,
          email: profile.email ?? undefined,
          image: profile.image ?? undefined,
          integrationKey: generateIntegrationId(),
        });
      }

      
      return existingUserId;
    },
  },
});


