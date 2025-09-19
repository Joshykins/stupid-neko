
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
        userId: v.optional(v.id("users")),
        title: v.string(),
        description: v.optional(v.string()),
        durationInMinutes: v.number(),
        occurredAt: v.optional(v.number()),
        languageCode: languageCodeValidator,
        contentKey: v.optional(v.string()),
        externalUrl: v.optional(v.string()),
        contentCategories: v.optional(v.array(v.union(v.literal("audio"), v.literal("video"), v.literal("text"), v.literal("other")))),
        isManuallyTracked: v.optional(v.boolean()),
        userTargetLanguageId: v.id("userTargetLanguages"),
        
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
            userTargetLanguageId: Id<"userTargetLanguages">;
            previousTotalExperience: number;
            newTotalExperience: number;
            previousLevel: number;
            newLevel: number;
            levelsGained: number;
        };
    }> => {
        const userId = args.userId ?? (await getAuthUserId(ctx));
        if (!userId) throw new Error("Unauthorized");


        // 1) Create the language activity
        const nowEffective = await getEffectiveNow(ctx);
        const occurredAt = args.occurredAt ?? nowEffective;
        const activityId = await ctx.db.insert("languageActivities", {
            userId,
            isManuallyTracked: args.isManuallyTracked ?? (args.source ?? "manual") === "manual",
            languageCode: args.languageCode,
            title: args.title,
            userTargetLanguageId: args.userTargetLanguageId ,
            description: args.description ?? undefined,
            // Canonical ms field
            durationInMs: Math.max(0, Math.round(args.durationInMinutes * 60 * 1000)),
            occurredAt,
            state: "completed",
            contentKey: args.contentKey ?? undefined,
            externalUrl: args.externalUrl ?? undefined,
        });

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
                durationInMinutes: args.durationInMinutes,
                occurredAt,
            }),
            isApplyingStreakBonus: true,
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
        externalUrl: v.optional(v.string()),
        contentCategories: v.optional(v.array(v.union(v.literal("audio"), v.literal("video"), v.literal("text"), v.literal("other")))),
        
    },
    returns: v.object({ activityId: v.id("languageActivities") }),
    handler: async (ctx, args): Promise<{ activityId: Id<"languageActivities"> }> => {
       const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthorized");

        const nowEffective = await getEffectiveNow(ctx);
        const occurredAt = args.occurredAt ?? nowEffective;

        // Infer language from user's current target language id
        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");
        const currentTargetLanguageId = user.currentTargetLanguageId as Id<"userTargetLanguages"> | undefined;
        if (!currentTargetLanguageId) throw new Error("User target language not found");
        const currentTargetLanguage = await ctx.db.get(currentTargetLanguageId);
        if (!currentTargetLanguage) throw new Error("User target language not found");
        const languageCode = currentTargetLanguage.languageCode as LanguageCode;


        const result = await ctx.runMutation(internal.languageActivityFunctions.addLanguageActivity, {
            userTargetLanguageId: currentTargetLanguage._id,
            title: args.title,
            description: args.description ?? undefined,
            durationInMinutes: args.durationInMinutes,
            occurredAt,
            externalUrl: args.externalUrl ?? undefined,
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
            // source removed from schema
            // categories removed from persisted schema
            isManuallyTracked: v.optional(v.boolean()),
            languageCode: v.optional(languageCodeValidator),
            title: v.optional(v.string()),
            description: v.optional(v.string()),
            durationInMs: v.optional(v.number()),
            occurredAt: v.optional(v.number()),
            state: v.union(v.literal("in-progress"), v.literal("completed")),
            contentKey: v.optional(v.string()),
            externalUrl: v.optional(v.string()),
            label: v.optional(
                v.object({
                    title: v.optional(v.string()),
                    authorName: v.optional(v.string()),
                    thumbnailUrl: v.optional(v.string()),
                    fullDurationInSeconds: v.optional(v.number()),
                    contentUrl: v.optional(v.string()),
                }),
            ),
            awardedExperience: v.number(),
        }),
    ),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];
        const limit = Math.max(1, Math.min(100, args.limit ?? 20));
        const items = await ctx.db
            .query("languageActivities")
            .withIndex("by_user_and_occurred", (q: any) => q.eq("userId", userId))
            .order("desc")
            .take(limit);
        const results: Array<any> = [];
        for (const it of items) {
            let label: any = undefined;
            const contentKey = (it as any).contentKey as string | undefined;
            if (contentKey) {
                const l = await ctx.db
                    .query("contentLabel")
                    .withIndex("by_content_key", (q: any) => q.eq("contentKey", contentKey))
                    .unique();
                if (l) {
                    label = {
                        title: (l as any).title,
                        authorName: (l as any).authorName,
                        thumbnailUrl: (l as any).thumbnailUrl,
                        fullDurationInSeconds: (l as any).fullDurationInSeconds,
                        contentUrl: (l as any).contentUrl,
                    };
                }
            }
            // Sum actual awarded experience tied to this activity from the ledger
            const exps = await ctx.db
                .query("userTargetLanguageExperienceLedger")
                .withIndex("by_language_activity", (q: any) => q.eq("languageActivityId", (it as any)._id))
                .collect();
            const awardedExperience = exps.reduce((sum: number, e: any) => sum + Math.floor(e?.deltaExperience ?? 0), 0);
            results.push({ ...(it as any), label, awardedExperience: Math.max(0, awardedExperience) });
        }
        return results;
    },
});

export const recentManualLanguageActivities = query({
    args: { limit: v.optional(v.number()) },
    returns: v.array(
        v.object({
            title: v.optional(v.string()),
            durationInMs: v.optional(v.number()),
            // categories removed from persisted schema
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
                durationInMs: (it as any).durationInMs,
                description: it.description,
                userTargetLanguageId: it.userTargetLanguageId,
            }));
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

        // Load user's preferred timezone (fallback to UTC)
        const user = await ctx.db.get(userId);
        const timeZone: string = ((user as any)?.timezone as string | undefined) || "UTC";

        // Helpers to work with local dates in a given timezone
        function getLocalYmdParts(ms: number): { y: number; m: number; d: number; weekday: string } {
            const fmt = new Intl.DateTimeFormat("en-US", {
                timeZone,
                year: "numeric",
                month: "numeric",
                day: "numeric",
                weekday: "short",
            });
            const parts = fmt.formatToParts(new Date(ms));
            const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]));
            const y = parseInt(lookup.year, 10);
            const m = parseInt(lookup.month, 10);
            const d = parseInt(lookup.day, 10);
            const weekday = lookup.weekday as string; // e.g., "Mon"
            return { y, m, d, weekday };
        }

        function localMidnightUtcMsForYmd(y: number, m: number, d: number): number {
            // Compute the UTC timestamp corresponding to local midnight for the provided Y-M-D in the user's timezone.
            const atUtcMidnight = new Date(Date.UTC(y, m - 1, d));
            const timeFmt = new Intl.DateTimeFormat("en-US", {
                timeZone,
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
            });
            const parts = timeFmt.formatToParts(atUtcMidnight);
            const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]));
            const hour = parseInt(lookup.hour || "0", 10);
            const minute = parseInt(lookup.minute || "0", 10);
            const offsetMinutes = hour * 60 + minute;
            return Date.UTC(y, m - 1, d) - offsetMinutes * 60 * 1000;
        }

        // Determine local Monday start for the user's week window using their timezone
        const effectiveNowMs = await getEffectiveNow(ctx);
        const { y: nowY, m: nowM, d: nowD, weekday } = getLocalYmdParts(effectiveNowMs);
        const weekdayIndexMap: Record<string, number> = { Sun: 6, Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5 };
        const daysSinceMonday = weekdayIndexMap[weekday] ?? 0;

        // Find the local date (Y-M-D) for Monday of the current week
        const anchorMs = Date.UTC(nowY, nowM - 1, nowD) - daysSinceMonday * 24 * 60 * 60 * 1000;
        const mondayLocal = getLocalYmdParts(anchorMs);
        const mondayStartLocalUtcMs = localMidnightUtcMsForYmd(mondayLocal.y, mondayLocal.m, mondayLocal.d);
        const sundayEndLocalUtcMs = mondayStartLocalUtcMs + 7 * 24 * 60 * 60 * 1000 - 1;

        // Initialize 7-day bins Mon..Sun
        const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
        const bins: Array<{ day: string; youtube: number; spotify: number; anki: number; misc: number; }> = labels.map((label) => ({
            day: label,
            youtube: 0,
            spotify: 0,
            anki: 0,
            misc: 0,
        }));

        // Query activities within this local week window using UTC timestamps
        const items = await ctx.db
            .query("languageActivities")
            .withIndex("by_user_and_occurred", (q: any) =>
                q
                    .eq("userId", userId)
                    .gte("occurredAt", mondayStartLocalUtcMs)
                    .lte("occurredAt", sundayEndLocalUtcMs),
            )
            .collect();

        // Precompute Monday local Y-M-D to build day index using local calendar days
        const mondayUtcOrdinal = Date.UTC(mondayLocal.y, mondayLocal.m - 1, mondayLocal.d);

        for (const it of items) {
            const occurred = (it as any).occurredAt ?? (it as any)._creationTime;
            const occurredLocal = getLocalYmdParts(occurred);
            // Day index is the difference in local calendar days from Monday
            const occurredOrdinal = Date.UTC(occurredLocal.y, occurredLocal.m - 1, occurredLocal.d);
            const dayIndex = Math.floor((occurredOrdinal - mondayUtcOrdinal) / (24 * 60 * 60 * 1000));
            if (dayIndex < 0 || dayIndex > 6) continue;

            const minutes = Math.max(0, Math.round(((it as any).durationInMs ?? 0) / 60000));

            const key = (it as any).contentKey as string | undefined;
            const inferred: "youtube" | "spotify" | "anki" | "misc" = key?.startsWith("youtube:")
                ? "youtube"
                : key?.startsWith("spotify:")
                ? "spotify"
                : key?.startsWith("anki:")
                ? "anki"
                : "misc";

            switch (inferred) {
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
                    bins[dayIndex].misc += minutes;
            }
        }

        return bins;
    },
});

export const deleteLanguageActivity = mutation({
    args: { activityId: v.id("languageActivities") },
    returns: v.object({ deleted: v.boolean(), reversedDelta: v.number() }),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthorized");

        const act = await ctx.db.get(args.activityId);
        if (!act) return { deleted: false, reversedDelta: 0 };
        if ((act as any).userId !== userId) throw new Error("Forbidden");

        const utlId = (act as any).userTargetLanguageId as Id<"userTargetLanguages">;
        const languageCode = (act as any).languageCode;

        // Sum all experience deltas tied to this activity
        const exps = await ctx.db
            .query("userTargetLanguageExperienceLedger")
            .withIndex("by_language_activity", (q: any) => q.eq("languageActivityId", args.activityId))
            .collect();
        const totalDelta = exps.reduce((sum, e: any) => sum + (e.deltaExperience ?? 0), 0);

        if (totalDelta !== 0) {
            await ctx.runMutation(internal.experienceFunctions.addExperience, {
                userId,
                languageCode,
                languageActivityId: args.activityId,
                deltaExperience: -totalDelta,
                isApplyingStreakBonus: false,
            });
        }

        // Adjust minutes
        const durationMinutes = Math.max(0, Math.round(((act as any).durationInMs ?? 0) / 60000));
        if (durationMinutes > 0) {
            const utl = await ctx.db.get(utlId);
            if (utl) {
                const currentTotalMinutes = (utl as any).totalMinutesLearning ?? 0;
                await ctx.db.patch(utlId, {
                    totalMinutesLearning: Math.max(0, currentTotalMinutes - durationMinutes),
                } as any);
            }
        }

        await ctx.db.delete(args.activityId);
        return { deleted: true, reversedDelta: totalDelta };
    },
});