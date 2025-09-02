import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { languageCodeValidator, type LanguageCode } from "./schema";

// Write your Convex functions in any file inside this directory (`convex`).
// See https://docs.convex.dev/functions for more.


export const me = query({
	args: {},
	returns: v.union(
		v.object({
			name: v.optional(v.string()),
			email: v.optional(v.string()),
			image: v.optional(v.string()),
			username: v.optional(v.string()),
		}),
		v.null(),
	),
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return null;
		const user = await ctx.db.get(userId);
		if (!user) return null;
		return {
			name: (user as any).name ?? undefined,
			email: (user as any).email ?? undefined,
			image: (user as any).image ?? undefined,
		};
	},
});


export const needsOnboarding = query({
    args: {},
    returns: v.boolean(),
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return true;
        const user = await ctx.db.get(userId);
        if (!user) return true;
        const heard: unknown = (user as any).qualifierFormHeardAboutUsFrom;
        return heard === null || heard === undefined || heard === "";
    },
});


export const updateMe = mutation({
    args: {
        name: v.optional(v.string()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthorized");
        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");

        await ctx.db.patch(userId, {
            ...(args.name !== undefined ? { name: args.name || undefined } : {}),
        } as any);
        return null;
    },
});



export const completeOnboarding = mutation({
    args: {
        targetLanguageCode: languageCodeValidator,
        qualifierFormHeardAboutUsFrom: v.optional(v.string()),
        qualifierFormLearningReason: v.optional(v.string()),
        qualifierFormCurrentLevel: v.optional(v.string()),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthorized");

        // Persist to users table
        await ctx.db.patch(userId, {
            ...(args.qualifierFormHeardAboutUsFrom !== undefined ? { qualifierFormHeardAboutUsFrom: args.qualifierFormHeardAboutUsFrom || undefined } : {}),
            ...(args.qualifierFormLearningReason !== undefined ? { qualifierFormLearningReason: args.qualifierFormLearningReason || undefined } : {}),
        } as any);

        // Upsert userTargetLanguages for (userId, language)
        const allowed: Array<LanguageCode> = ["en", "ja", "es", "fr", "de", "ko", "it", "zh", "hi", "ru", "ar", "pt", "tr"];
        if (!allowed.includes(args.targetLanguageCode as LanguageCode)) {
            throw new Error("Unsupported language code");
        }

        const existing = await ctx.db
            .query("userTargetLanguages")
            .withIndex("by_user_and_language", (q: any) => q.eq("userId", userId as any).eq("languageCode", args.targetLanguageCode))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                languageCode: args.targetLanguageCode,
                totalExperience: 0,
                qualifierFormCurrentLevel: args.qualifierFormCurrentLevel ?? undefined,
            } as any);
        } else {
            await ctx.db.insert("userTargetLanguages", {
                userId,
                languageCode: args.targetLanguageCode,
                totalExperience: 0,
                qualifierFormCurrentLevel: args.qualifierFormCurrentLevel ?? undefined,
            } as any);
        }

        return null;
    },
});

export const checkEmailForPasswordSignup = action({
    args: { email: v.string() },
    returns: v.object({ allowed: v.boolean(), reason: v.optional(v.string()) }),
    handler: async (ctx, { email }) => {
        const users = await (ctx as any).db
            .query("users")
            .withIndex("email", (q: any) => q.eq("email", email))
            .take(2);
        if (users.length === 0) return { allowed: true };
        const userId = users[0]._id;
        const oauthAccounts = await (ctx as any).db
            .query("authAccounts")
            .withIndex("userIdAndProvider", (q: any) => q.eq("userId", userId))
            .filter((q: any) => q.neq(q.field("provider"), "password"))
            .take(1);
        if (oauthAccounts.length > 0) {
            return {
                allowed: false,
                reason: "An account already exists for this email via OAuth. Please sign in with Google or Discord.",
            };
        }
        return { allowed: true };
    },
});

export const addManualTrackedItem = mutation({
    args: {
        title: v.string(),
        description: v.optional(v.string()),
        durationInMinutes: v.number(),
        occurredAt: v.optional(v.number()),
        language: v.optional(v.union(v.literal("ja"), v.literal("en"))),
        contentCategories: v.optional(v.array(v.union(v.literal("audio"), v.literal("video"), v.literal("text"), v.literal("other")))),
        skillCategories: v.optional(
            v.array(
                v.union(
                    v.literal("listening"),
                    v.literal("reading"),
                    v.literal("speaking"),
                    v.literal("writing"),
                ),
            ),
        ),
    },
    returns: v.id("trackedItems"),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthorized");

        const now = Date.now();
        const occurredAt = args.occurredAt ?? now;

        const insertedId = await ctx.db.insert("trackedItems", {
            userId,
            source: "manual",
            contentCategories: args.contentCategories ?? undefined,
            skillCategories: args.skillCategories ?? undefined,
            isManuallyTracked: true,
            languageCode: args.language ?? undefined,
            title: args.title,
            description: args.description ?? undefined,
            durationInSeconds: Math.max(0, Math.round(args.durationInMinutes * 60)),
            occurredAt,
        } as any);

        return insertedId;
    },
});

export const listManualTrackedTitles = query({
    args: {},
    returns: v.array(v.string()),
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];
        const items = await ctx.db
            .query("trackedItems")
            .withIndex("by_user", (q: any) => q.eq("userId", userId))
            .order("desc")
            .take(200);
        const set = new Set<string>();
        for (const it of items) {
            if (it.isManuallyTracked && it.title) set.add(it.title);
        }
        return Array.from(set).slice(0, 25);
    },
});

export const listRecentTrackedItems = query({
    args: { limit: v.optional(v.number()) },
    returns: v.array(
        v.object({
            _id: v.id("trackedItems"),
            _creationTime: v.number(),
            userId: v.id("users"),
            source: v.optional(
                v.union(
                    v.literal("youtube"),
                    v.literal("spotify"),
                    v.literal("anki"),
                    v.literal("manual"),
                ),
            ),
            contentCategories: v.optional(
                v.array(
                    v.union(
                        v.literal("audio"),
                        v.literal("video"),
                        v.literal("text"),
                        v.literal("other"),
                    ),
                ),
            ),
            skillCategories: v.optional(
                v.array(
                    v.union(
                        v.literal("listening"),
                        v.literal("reading"),
                        v.literal("speaking"),
                        v.literal("writing"),
                    ),
                ),
            ),
            isManuallyTracked: v.optional(v.boolean()),
            language: v.optional(v.union(v.literal("ja"), v.literal("en"))),
            languageCode: v.optional(v.union(v.literal("ja"), v.literal("en"))),
            title: v.optional(v.string()),
            description: v.optional(v.string()),
            durationInSeconds: v.optional(v.number()),
            occurredAt: v.optional(v.number()),
        }),
    ),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];
        const limit = Math.max(1, Math.min(100, args.limit ?? 20));
        const items = await ctx.db
            .query("trackedItems")
            .withIndex("by_user", (q: any) => q.eq("userId", userId))
            .order("desc")
            .take(limit);
        return items as any;
    },
});

export const recentManualTrackedItems = query({
    args: { limit: v.optional(v.number()) },
    returns: v.array(
        v.object({
            title: v.optional(v.string()),
            durationInSeconds: v.optional(v.number()),
            contentCategories: v.optional(v.array(v.union(v.literal("audio"), v.literal("video"), v.literal("text"), v.literal("other")))),
            skillCategories: v.optional(v.array(v.union(v.literal("listening"), v.literal("reading"), v.literal("speaking"), v.literal("writing")))),
            description: v.optional(v.string()),
        }),
    ),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];
        const items = await ctx.db
            .query("trackedItems")
            .withIndex("by_user", (q: any) => q.eq("userId", userId))
            .order("desc")
            .take(Math.max(1, Math.min(20, args.limit ?? 8)));
        return items
            .filter((it) => it.isManuallyTracked)
            .map((it) => ({
                title: it.title,
                durationInSeconds: it.durationInSeconds,
                contentCategories: it.contentCategories,
                skillCategories: it.skillCategories,
                description: it.description,
            }));
    },
});

export const deleteAllMyTrackedItems = mutation({
    args: {},
    returns: v.object({ deleted: v.number() }),
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthorized");

        let deleted = 0;
        const items = await ctx.db
            .query("trackedItems")
            .withIndex("by_user", (q: any) => q.eq("userId", userId))
            .collect();
        for (const it of items) {
            await ctx.db.delete(it._id);
            deleted += 1;
        }
        return { deleted };
    },
});

export const seedMyTrackedItems = mutation({
    args: {
        start: v.number(), // ms timestamp
        end: v.number(),   // ms timestamp
        numRecords: v.number(),
        minMinutes: v.number(),
        maxMinutes: v.number(),
        language: v.optional(v.union(v.literal("ja"), v.literal("en"))),
    },
    returns: v.object({ inserted: v.number() }),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthorized");

        const start = Math.min(args.start, args.end);
        const end = Math.max(args.start, args.end);
        const total = Math.max(0, Math.min(2000, Math.floor(args.numRecords)));
        const minM = Math.max(1, Math.floor(args.minMinutes));
        const maxM = Math.max(minM, Math.floor(args.maxMinutes));

        const titles = [
            "Podcast episode",
            "YouTube video",
            "Reading article",
            "Anki review",
            "Grammar practice",
            "Listening drill",
            "Conversation practice",
            "Writing journal",
        ];
        const contentOptions = ["audio", "video", "text", "other"] as const;
        const skillOptions = ["listening", "reading", "speaking", "writing"] as const;

        function randomInt(min: number, max: number): number {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }
        function pickSome<T>(arr: ReadonlyArray<T>, min: number, max: number): Array<T> {
            const count = randomInt(min, max);
            const shuffled = [...arr].sort(() => Math.random() - 0.5);
            return shuffled.slice(0, count);
        }

        let inserted = 0;
        for (let i = 0; i < total; i++) {
            const occurredAt = start + Math.floor(Math.random() * (end - start + 1));
            const durationInMinutes = randomInt(minM, maxM);
            const contentCategories = pickSome(contentOptions, 1, 2) as any;
            const skillCategories = pickSome(skillOptions, 1, 2) as any;
            const title = titles[randomInt(0, titles.length - 1)];

            await ctx.db.insert("trackedItems", {
                userId,
                source: "manual",
                isManuallyTracked: true,
                languageCode: args.language ?? undefined,
                title,
            description: undefined,
                contentCategories,
                skillCategories,
                durationInSeconds: durationInMinutes * 60,
                occurredAt,
            } as any);
            inserted += 1;
        }

        return { inserted };
    },
});

export const dailyHeatmapValues = query({
    args: { days: v.optional(v.number()) },
    returns: v.array(v.number()),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        const days = Math.max(1, Math.min(366, Math.floor(args.days ?? 365)));

        // If unauthenticated, return empty to allow client fallback/demo values
        if (!userId) return new Array(days).fill(0);

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const endOfTodayMs = now.getTime() + 24 * 60 * 60 * 1000 - 1; // inclusive end
        const startMs = now.getTime() - (days - 1) * 24 * 60 * 60 * 1000;

        // Initialize buckets for minutes per day (oldest -> newest)
        const minutesPerDay: Array<number> = new Array(days).fill(0);

        const items = await ctx.db
            .query("trackedItems")
            .withIndex("by_user_and_occurred", (q: any) =>
                q.eq("userId", userId).gte("occurredAt", startMs).lte("occurredAt", endOfTodayMs),
            )
            .order("asc")
            .collect();

        for (const it of items as any[]) {
            const occurredAt: number | undefined = it.occurredAt;
            if (occurredAt === undefined || occurredAt === null) continue;
            const idx = Math.floor((occurredAt - startMs) / (24 * 60 * 60 * 1000));
            if (idx < 0 || idx >= days) continue;
            const minutes = Math.max(0, Math.floor((it.durationInSeconds ?? 0) / 60));
            minutesPerDay[idx] += minutes;
        }

        // Map minutes to intensity buckets 0..4
        const intensities: Array<number> = minutesPerDay.map((m) => {
            if (m <= 0) return 0;
            if (m < 10) return 1;
            if (m < 25) return 2;
            if (m < 60) return 3;
            return 4;
        });

        return intensities;
    },
});
