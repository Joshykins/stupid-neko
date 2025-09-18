import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
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

    // After moving the effective day forward, try auto-bridging a single missed day
    // so streak vacations are applied during dev time travel.
    try {
      await ctx.runMutation(internal.streakFunctions.nudgeUserStreak, {
        userId,
        now: next,
      });
    } catch (e) {
      // Best-effort; ignore if nudge fails
    }

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

export const seedAtDevDate = mutation({
  args: {
    items: v.number(),
    minMinutes: v.number(),
    maxMinutes: v.number(),
    manualOnly: v.optional(v.boolean()),
    probManual: v.optional(v.number()),
    probYoutube: v.optional(v.number()),
    probSpotify: v.optional(v.number()),
    probAnki: v.optional(v.number()),
  },
  returns: v.object({ inserted: v.number() }),
  handler: async (ctx, args) => {
    if (!isDangerousTestingEnabled()) {
      return { inserted: 0 };
    }
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const nowEffective = await getEffectiveNow(ctx);

    // Infer current target language
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    const utl = await ctx.db
      .query("userTargetLanguages")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .order("desc")
      .take(1);
    const userTargetLanguageId = utl && utl[0]?._id;
    const languageCode = utl && utl[0]?.languageCode;
    if (!userTargetLanguageId || !languageCode) return { inserted: 0 };

    const items = Math.max(0, Math.min(20, Math.floor(args.items)));
    const minM = Math.max(1, Math.floor(args.minMinutes));
    const maxM = Math.max(minM, Math.floor(args.maxMinutes));
    const manualOnly = !!args.manualOnly;

    // Weights for non-manual seeding (if manualOnly is false)
    const pm = Math.max(0, Math.floor(args.probManual ?? 0));
    const py = Math.max(0, Math.floor(args.probYoutube ?? 0));
    const ps = Math.max(0, Math.floor(args.probSpotify ?? 0));
    const pa = Math.max(0, Math.floor(args.probAnki ?? 0));
    const sum = pm + py + ps + pa;
    const weights = sum > 0 ? { manual: pm / sum, youtube: py / sum, spotify: ps / sum, anki: pa / sum } : { manual: 1, youtube: 0, spotify: 0, anki: 0 };

    function pickSource() {
      if (manualOnly) return "manual" as const;
      const r = Math.random();
      if (r < weights.manual) return "manual" as const;
      if (r < weights.manual + weights.youtube) return "youtube" as const;
      if (r < weights.manual + weights.youtube + weights.spotify) return "spotify" as const;
      return "anki" as const;
    }

    let inserted = 0;
    for (let i = 0; i < items; i++) {
      const source = pickSource();
      const durationInMinutes = Math.floor(Math.random() * (maxM - minM + 1)) + minM;
      const title = source === "anki" ? "Anki review" : source === "youtube" ? "YouTube video" : source === "spotify" ? "Spotify listening" : "Manual entry";
      await ctx.runMutation(internal.languageActivityFunctions.addLanguageActivity, {
        title,
        durationInMinutes,
        occurredAt: nowEffective,
        languageCode: languageCode as any,
        contentCategories: source === "anki" ? ["other"] : source === "youtube" ? ["video"] : source === "spotify" ? ["audio"] : ["other"],
        skillCategories: source === "anki" ? ["reading"] : ["listening"],
        isManuallyTracked: source === "manual",
        userTargetLanguageId: userTargetLanguageId as any,
        source,
      } as any);
      inserted += 1;
    }

    return { inserted };
  },
});

export const seedToTargetAtDevDate = mutation({
  args: {
    targetMinutes: v.number(),
    minChunk: v.optional(v.number()),
    maxChunk: v.optional(v.number()),
    manualOnly: v.optional(v.boolean()),
    probManual: v.optional(v.number()),
    probYoutube: v.optional(v.number()),
    probSpotify: v.optional(v.number()),
    probAnki: v.optional(v.number()),
  },
  returns: v.object({ inserted: v.number(), seededMinutes: v.number() }),
  handler: async (ctx, args) => {
    if (!isDangerousTestingEnabled()) {
      return { inserted: 0, seededMinutes: 0 };
    }
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const nowEffective = await getEffectiveNow(ctx);

    // Infer current target language
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    const utl = await ctx.db
      .query("userTargetLanguages")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .order("desc")
      .take(1);
    const userTargetLanguageId = utl && utl[0]?._id;
    const languageCode = utl && utl[0]?.languageCode;
    if (!userTargetLanguageId || !languageCode) return { inserted: 0, seededMinutes: 0 };

    const target = Math.max(1, Math.min(960, Math.floor(args.targetMinutes))); // cap 16h
    const minC = Math.max(1, Math.floor(args.minChunk ?? 10));
    const maxC = Math.max(minC, Math.floor(args.maxChunk ?? 45));
    const manualOnly = !!args.manualOnly;

    // Weights for sources
    const pm = Math.max(0, Math.floor(args.probManual ?? 25));
    const py = Math.max(0, Math.floor(args.probYoutube ?? 25));
    const ps = Math.max(0, Math.floor(args.probSpotify ?? 25));
    const pa = Math.max(0, Math.floor(args.probAnki ?? 25));
    const sum = pm + py + ps + pa;
    const weights = sum > 0 ? { manual: pm / sum, youtube: py / sum, spotify: ps / sum, anki: pa / sum } : { manual: 1, youtube: 0, spotify: 0, anki: 0 };

    function pickSource() {
      if (manualOnly) return "manual" as const;
      const r = Math.random();
      if (r < weights.manual) return "manual" as const;
      if (r < weights.manual + weights.youtube) return "youtube" as const;
      if (r < weights.manual + weights.youtube + weights.spotify) return "spotify" as const;
      return "anki" as const;
    }

    function randomInt(lo: number, hi: number) { return Math.floor(Math.random() * (hi - lo + 1)) + lo; }

    let inserted = 0;
    let seededMinutes = 0;
    const MAX_ITEMS = 16;

    while (seededMinutes < target && inserted < MAX_ITEMS) {
      const remaining = target - seededMinutes;
      const chunk = Math.min(remaining, randomInt(minC, maxC));
      if (chunk <= 0) break;
      const source = pickSource();
      const title = source === "anki" ? "Anki review" : source === "youtube" ? "YouTube video" : source === "spotify" ? "Spotify listening" : "Manual entry";

      await ctx.runMutation(internal.languageActivityFunctions.addLanguageActivity, {
        title,
        durationInMinutes: chunk,
        occurredAt: nowEffective,
        languageCode: languageCode as any,
        contentCategories: source === "anki" ? ["other"] : source === "youtube" ? ["video"] : source === "spotify" ? ["audio"] : ["other"],
        skillCategories: source === "anki" ? ["reading"] : ["listening"],
        isManuallyTracked: source === "manual",
        userTargetLanguageId: userTargetLanguageId as any,
        source,
      } as any);

      seededMinutes += chunk;
      inserted += 1;
    }

    return { inserted, seededMinutes };
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

    // 1b) Delete all content activities for the user
    const contentActs = await ctx.db
      .query("contentActivities")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    for (const ev of contentActs) {
      await ctx.db.delete(ev._id);
    }

    // 2) Delete experience records for the user
    const exps = await ctx.db
      .query("userTargetLanguageExperienceLedger")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    for (const e of exps) {
      await ctx.db.delete(e._id);
    }

    // 2b) Delete streak day ledger entries
    const dayLedger = await ctx.db
      .query("streakDayLedger")
      .withIndex("by_user_and_occurred", (q: any) => q.eq("userId", userId))
      .collect();
    for (const row of dayLedger) {
      await ctx.db.delete(row._id);
    }

    // 2c) Delete streak vacation ledger entries
    const freezeLedger = await ctx.db
      .query("streakVacationLedger")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    for (const row of freezeLedger) {
      await ctx.db.delete(row._id);
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


