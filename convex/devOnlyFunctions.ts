import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";
import { dangerousTestingEnabled, getEffectiveNow } from "./utils";

function isDangerousTestingEnabled() {
    console.log("isDangerousTestingEnabled", process.env.DANGEROUS_TESTING);
  return dangerousTestingEnabled();
}

export const getDevDate = query({
  args: {},
  returns: v.union(v.number(), v.null()),
  handler: async (ctx) => {
    if (!isDangerousTestingEnabled()) {
      return null;
    }
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return (user as any).devDate ?? null;
  },
});

export const setDevDate = mutation({
  args: { timestamp: v.union(v.number(), v.null()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!isDangerousTestingEnabled()) {
      // In non-dev, ensure value remains cleared and do nothing
      return null;
    }
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    await ctx.db.patch(userId, { devDate: args.timestamp ?? undefined } as any);
    return null;
  },
});

export const stepDevDate = mutation({
  args: {
    days: v.number(), // positive or negative
    seedEachStep: v.optional(v.boolean()),
    seedPerStepCount: v.optional(v.number()),
    seedMinMinutes: v.optional(v.number()),
    seedMaxMinutes: v.optional(v.number()),
    // Probabilities for sources, sum does not need to be 100; normalized internally
    probManual: v.optional(v.number()),
    probYoutube: v.optional(v.number()),
    probSpotify: v.optional(v.number()),
    probAnki: v.optional(v.number()),
  },
  returns: v.object({ devDate: v.number() }),
  handler: async (ctx, args) => {
    if (!isDangerousTestingEnabled()) {
      // In non-dev, do nothing and return current wall clock for client UI
      return { devDate: Date.now() };
    }
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const now = await getEffectiveNow(ctx);
    const current = (user as any).devDate ?? now;
    const oneDayMs = 24 * 60 * 60 * 1000;
    const step = Math.max(0, Math.trunc(args.days)); // forward only
    const next = current + step * oneDayMs;

    await ctx.db.patch(userId, { devDate: next } as any);

    if (args.seedEachStep) {
      const count = Math.max(0, Math.floor(args.seedPerStepCount ?? 0));
      const minM = Math.max(1, Math.floor(args.seedMinMinutes ?? 5));
      const maxM = Math.max(minM, Math.floor(args.seedMaxMinutes ?? 60));

      // Seed records at the resulting day timestamp
      if (count > 0) {
        // Normalize probabilities
        const pm = Math.max(0, Math.floor(args.probManual ?? 0));
        const py = Math.max(0, Math.floor(args.probYoutube ?? 0));
        const ps = Math.max(0, Math.floor(args.probSpotify ?? 0));
        const pa = Math.max(0, Math.floor(args.probAnki ?? 0));
        const sum = pm + py + ps + pa;
        const weights = sum > 0 ? { manual: pm / sum, youtube: py / sum, spotify: ps / sum, anki: pa / sum } : { manual: 0.25, youtube: 0.25, spotify: 0.25, anki: 0.25 };

        // Helper to sample a source by weight
        function pickSource() {
          const r = Math.random();
          if (r < weights.manual) return "manual" as const;
          if (r < weights.manual + weights.youtube) return "youtube" as const;
          if (r < weights.manual + weights.youtube + weights.spotify) return "spotify" as const;
          return "anki" as const;
        }

        // Infer userTargetLanguage for passing into addLanguageActivity
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthorized");
        const utl = await ctx.db.query("userTargetLanguages").withIndex("by_user", (q: any) => q.eq("userId", userId)).order("desc").take(1);
        const userTargetLanguageId = utl && utl[0]?._id;
        const languageCode = utl && utl[0]?.languageCode;

        for (let i = 0; i < count; i++) {
          const source = pickSource();
          const durationInMinutes = Math.floor(Math.random() * (maxM - minM + 1)) + minM;
          const title = source === "anki" ? "Anki review" : source === "youtube" ? "YouTube video" : source === "spotify" ? "Spotify listening" : "Manual entry";
          await ctx.runMutation(internal.languageActivityFunctions.addLanguageActivity, {
            title,
            durationInMinutes,
            occurredAt: next,
            languageCode: languageCode as any,
            contentCategories: source === "anki" ? ["other"] : source === "youtube" ? ["video"] : source === "spotify" ? ["audio"] : ["other"],
            skillCategories: source === "anki" ? ["reading"] : ["listening"],
            isManuallyTracked: source === "manual",
            userTargetLanguageId: userTargetLanguageId as any,
            source,
          } as any);
        }
      }
    }

    return { devDate: next };
  },
});

export const resetMyDevState = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    if (!isDangerousTestingEnabled()) {
      return null;
    }
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    // 1) Delete all language activities for the user
    const activities = await ctx.db
      .query("languageActivities")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    for (const a of activities) {
      await ctx.db.delete(a._id);
    }

    // 2) Delete experience records and multipliers for the user
    const exps = await ctx.db
      .query("userTargetLanguageExperiences")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    for (const e of exps) {
      await ctx.db.delete(e._id);
    }

    const mults = await ctx.db
      .query("userTargetLanguageExperiencesMultipliers")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    for (const m of mults) {
      await ctx.db.delete(m._id);
    }

    // 3) Reset aggregate fields on user and userTargetLanguage
    await ctx.db.patch(userId, {
      currentStreak: 0,
      longestStreak: 0,
      lastStreakCreditAt: undefined,
      devDate: Date.now(),
    } as any);

    const utls = await ctx.db
      .query("userTargetLanguages")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    for (const utl of utls) {
      await ctx.db.patch(utl._id, {
        totalMinutesLearning: 0,
        totalExperience: 0,
      });
    }

    // 4) Clear streakDays for the user
    const days = await ctx.db
      .query("streakDays")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    for (const d of days) {
      await ctx.db.delete(d._id);
    }

    return null;
  },
});


