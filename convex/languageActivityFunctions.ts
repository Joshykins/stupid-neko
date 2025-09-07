
import { v } from "convex/values";
import { query, mutation, action, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";
import { languageCodeValidator, type LanguageCode } from "./schema";
import { UserIdentity } from "convex/server";
import { Id } from "./_generated/dataModel";
import { getEffectiveNow } from "./utils";


// Create activity, update streak, then add experience (internal)
export const addLanguageActivity = internalMutation({
    args: {
        title: v.string(),
        description: v.optional(v.string()),
        durationInMinutes: v.number(),
        occurredAt: v.optional(v.number()),
        languageCode: languageCodeValidator,
        contentCategories: v.optional(v.array(v.union(v.literal("audio"), v.literal("video"), v.literal("text"), v.literal("other")))),
        skillCategories: v.optional(v.array(v.union(v.literal("listening"), v.literal("reading"), v.literal("speaking"), v.literal("writing")))),
        isManuallyTracked: v.optional(v.boolean()),
        userTargetLanguageId: v.optional(v.id("userTargetLanguages")),
        source: v.optional(
            v.union(
                v.literal("youtube"),
                v.literal("spotify"),
                v.literal("anki"),
                v.literal("manual"),
            ),
        ),
    },
    returns: v.object({
        activityId: v.id("languageActivities"),
        currentStreak: v.number(),
        longestStreak: v.number(),
        experience: v.object({
            userTargetLanguageId: v.id("userTargetLanguages"),
            previousTotalExperience: v.number(),
            newTotalExperience: v.number(),
            previousLevel: v.number(),
            newLevel: v.number(),
            levelsGained: v.number(),
        }),
    }),
    handler: async (ctx, args): Promise<{
        activityId: any;
        currentStreak: number;
        longestStreak: number;
        experience: {
            userTargetLanguageId: any;
            previousTotalExperience: number;
            newTotalExperience: number;
            previousLevel: number;
            newLevel: number;
            levelsGained: number;
        };
    }> => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthorized");


        // 1) Create the language activity
        const now = Date.now();
        const occurredAt = args.occurredAt ?? now;
        const activityId = await ctx.db.insert("languageActivities", {
            userId,
            source: (args as any).source ?? "manual",
            isManuallyTracked: args.isManuallyTracked ?? ((args as any).source ?? "manual") === "manual",
            languageCode: args.languageCode,
            title: args.title,
            userTargetLanguageId: args.userTargetLanguageId,
            description: args.description ?? undefined,
            durationInSeconds: Math.max(0, Math.round(args.durationInMinutes * 60)),
            occurredAt,
        } as any);

        // 2) Update streak
        const streak = await ctx.runMutation(internal.streakFunctions.updateStreakOnActivity, {
            userId,
            occurredAt,
        });

        // 3) Add experience (with optional streak bonus)
        const exp = await ctx.runMutation(internal.experienceFunctions.addExperience, {
            userId,
            languageCode: args.languageCode,
            languageActivityId: activityId,
            deltaExperience: await ctx.runQuery(internal.experienceFunctions.getExperienceForActivity, {
                userId,
                languageCode: args.languageCode,
                isManuallyTracked: args.isManuallyTracked ?? false,
                contentCategories: args.contentCategories ?? undefined,
                skillCategories: args.skillCategories ?? undefined,
                durationInMinutes: args.durationInMinutes,
            }),
            isApplyingStreakBonus: false,
            durationInMinutes: args.durationInMinutes,
        });

        return {
            activityId,
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak,
            experience: {
                userTargetLanguageId: exp.userTargetLanguageId,
                previousTotalExperience: exp.result.previousTotalExperience,
                newTotalExperience: exp.result.newTotalExperience,
                previousLevel: exp.result.previousLevel,
                newLevel: exp.result.newLevel,
                levelsGained: exp.result.levelsGained,
            },
        };
    },
});



export const addManualLanguageActivity = mutation({
    args: {
        title: v.string(),
        description: v.optional(v.string()),
        durationInMinutes: v.number(),
        occurredAt: v.optional(v.number()),
        language: v.optional(languageCodeValidator),
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
    returns: v.object({ activityId: v.id("languageActivities") }),
    handler: async (ctx, args): Promise<{ activityId: Id<"languageActivities"> }> => {
       const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthorized");

        const now = Date.now();
        const occurredAt = args.occurredAt ?? now;

        // Infer language from user's last updated target language
        const userTargetLanguage = await ctx.db.query("userTargetLanguages").withIndex("by_user", (q: any) => q.eq("userId", userId)).order("desc").take(1);
        if (!userTargetLanguage) throw new Error("User target language not found");
        const languageCode = userTargetLanguage[0].languageCode;


        const result = await ctx.runMutation(internal.languageActivityFunctions.addLanguageActivity, {
            userTargetLanguageId: userTargetLanguage[0]._id,
            title: args.title,
            description: args.description ?? undefined,
            durationInMinutes: args.durationInMinutes,
            occurredAt,
            contentCategories: args.contentCategories ?? undefined,
            skillCategories: args.skillCategories ?? undefined,
            isManuallyTracked: true,
            languageCode: languageCode as LanguageCode,
        });
       
        
        return { activityId: result.activityId };
    },
});



export const listManualTrackedLanguageActivities = query({
    args: {},
    returns: v.array(v.string()),
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];
        const items = await ctx.db
            .query("languageActivities")
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

export const listRecentLanguageActivities = query({
    args: { limit: v.optional(v.number()) },
    returns: v.array(
        v.object({
            _id: v.id("languageActivities"),
            _creationTime: v.number(),
            userId: v.id("users"),
            userTargetLanguageId: v.id("userTargetLanguages"),
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
            languageCode: v.optional(languageCodeValidator),
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
            .query("languageActivities")
            .withIndex("by_user", (q: any) => q.eq("userId", userId))
            .order("desc")
            .take(limit);
        return items;
    },
});

export const recentManualLanguageActivities = query({
    args: { limit: v.optional(v.number()) },
    returns: v.array(
        v.object({
            title: v.optional(v.string()),
            durationInSeconds: v.optional(v.number()),
            contentCategories: v.optional(v.array(v.union(v.literal("audio"), v.literal("video"), v.literal("text"), v.literal("other")))),
            skillCategories: v.optional(v.array(v.union(v.literal("listening"), v.literal("reading"), v.literal("speaking"), v.literal("writing")))),
            description: v.optional(v.string()),
            userTargetLanguageId: v.id("userTargetLanguages"),
        }),
    ),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];
        const items = await ctx.db
            .query("languageActivities")
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
                userTargetLanguageId: it.userTargetLanguageId,
            }));
    },
});

export const deleteAllMyLanguageActivities = mutation({
    args: {},
    returns: v.object({ deleted: v.number() }),
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthorized");

        let deleted = 0;
        const items = await ctx.db
            .query("languageActivities")
            .withIndex("by_user", (q: any) => q.eq("userId", userId))
            .collect();
        for (const it of items) {
            await ctx.db.delete(it._id);
            deleted += 1;
        }
        return { deleted };
    },
});

export const seedMyLanguageActivities = mutation({
    args: {
        start: v.number(), // ms timestamp
        end: v.number(),   // ms timestamp
        numRecords: v.number(),
        minMinutes: v.number(),
        maxMinutes: v.number(),
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

        // Infer language from user's last updated target language
        const userTargetLanguage = await ctx.db.query("userTargetLanguages").withIndex("by_user", (q: any) => q.eq("userId", userId)).order("desc").take(1);
        if (!userTargetLanguage) throw new Error("User target language not found");
        const languageCode = userTargetLanguage[0]!.languageCode!;


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

            await ctx.runMutation(internal.languageActivityFunctions.addLanguageActivity, {
                title,
                durationInMinutes,
                contentCategories,
                skillCategories,
                languageCode,
                userTargetLanguageId: userTargetLanguage[0]!._id,
                isManuallyTracked: true,
                occurredAt,
            });
            inserted += 1;
        }

        return { inserted };
    },
});

// Weekly source distribution for the current week (Mon-Sun), aggregated in minutes
export const getWeeklySourceDistribution = query({
    args: {},
    returns: v.array(
        v.object({
            day: v.string(),
            youtube: v.number(),
            spotify: v.number(),
            anki: v.number(),
            misc: v.number(),
        }),
    ),
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        // Compute start of week (Monday 00:00) and end of week (Sunday 23:59:59.999) in UTC
        const effectiveNowMs = await getEffectiveNow(ctx);
        const now = new Date(effectiveNowMs);
        const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const weekday = todayUtc.getUTCDay(); // 0=Sun,1=Mon,...6=Sat
        const daysSinceMonday = (weekday + 6) % 7; // Mon->0, Tue->1, ..., Sun->6
        const mondayStartUtcMs = todayUtc.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000;
        const sundayEndUtcMs = mondayStartUtcMs + 7 * 24 * 60 * 60 * 1000 - 1;

        // Initialize 7-day bins Mon..Sun
        const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
        const bins: Array<{ day: string; youtube: number; spotify: number; anki: number; misc: number; }> = labels.map((label) => ({
            day: label,
            youtube: 0,
            spotify: 0,
            anki: 0,
            misc: 0,
        }));

        // Query activities within this week using the by_user_and_occurred index
        const items = await ctx.db
            .query("languageActivities")
            .withIndex("by_user_and_occurred", (q: any) =>
                q
                    .eq("userId", userId)
                    .gte("occurredAt", mondayStartUtcMs)
                    .lte("occurredAt", sundayEndUtcMs),
            )
            .collect();

        for (const it of items) {
            const occurred = (it as any).occurredAt ?? (it as any)._creationTime;
            const dayIndex = Math.floor((occurred - mondayStartUtcMs) / (24 * 60 * 60 * 1000));
            if (dayIndex < 0 || dayIndex > 6) continue;
            const minutes = Math.max(0, Math.round(((it as any).durationInSeconds ?? 0) / 60));

            const source = (it as any).source as
                | "youtube"
                | "spotify"
                | "anki"
                | "manual"
                | undefined;
            switch (source) {
                case "youtube":
                    bins[dayIndex].youtube += minutes;
                    break;
                case "spotify":
                    bins[dayIndex].spotify += minutes;
                    break;
                case "anki":
                    bins[dayIndex].anki += minutes;
                    break;
                default:
                    bins[dayIndex].misc += minutes; // manual or undefined -> misc
            }
        }

        return bins;
    },
});