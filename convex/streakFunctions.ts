import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const updateStreakDays = internalMutation({
  args: {
    userId: v.id("users"),
    occurredAt: v.optional(v.number()),
  },
  returns: v.object({
    numberOfActivities: v.number(),
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const nowUtc = args.occurredAt ?? Date.now();

    const numberOfActivities = await ctx.db.query("languageActivities").withIndex("by_user", (q: any) => q.eq("userId", args.userId)).collect();

    //insert into streakDays
    await ctx.db.insert("streakDays", {
      userId: args.userId,
      day: nowUtc,
      numberOfActivities: numberOfActivities.length,
    });

    return { numberOfActivities: numberOfActivities.length };
  },
});

const HOUR = 60 * 60 * 1000;
const WINDOW_MS = 24 * HOUR;     // must space credits by at least this much
const GRACE_MS  = 8 * HOUR;      // allow a small late window

export const updateStreakOnActivity = internalMutation({
  args: {
    userId: v.id("users"),
    occurredAt: v.optional(v.number()), // UTC ms; defaults to now
  },
  returns: v.object({
    currentStreak: v.number(),
    longestStreak: v.number(),
    didIncrementToday: v.boolean(), // "today" now means "in this 24h window"
  }),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const nowUtc = args.occurredAt ?? Date.now();

    // Pull streak state
    let currentStreak = user.currentStreak ?? 0;
    let longestStreak = user.longestStreak ?? 0;
    const lastCredit  = user.lastStreakCreditAt ?? null;

    // If this is the first-ever credit, start streak at 1
    if (lastCredit === null) {
      currentStreak = Math.max(1, currentStreak || 0) || 1;
      longestStreak = Math.max(longestStreak, currentStreak);
      await ctx.db.patch(args.userId, {
        currentStreak,
        longestStreak,
        lastStreakCreditAt: nowUtc,
      });
      return { currentStreak, longestStreak, didIncrementToday: true };
    }

    const delta = nowUtc - lastCredit;

    if (delta < WINDOW_MS) {
      // Already credited in this rolling 24h window — do nothing
      return { currentStreak, longestStreak, didIncrementToday: false };
    }

    if (delta <= WINDOW_MS + GRACE_MS) {
      // On-time (or slightly late): continue streak
      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);

      await ctx.runMutation(internal.streakFunctions.updateStreakDays, {
        userId: args.userId,
        occurredAt: nowUtc,
      });
    } else {
      // Missed the window + grace: streak resets
      currentStreak = 1;
      longestStreak = Math.max(longestStreak, currentStreak);

      
      await ctx.runMutation(internal.streakFunctions.updateStreakDays, {
        userId: args.userId,
        occurredAt: nowUtc,
      });
    }

    await ctx.db.patch(args.userId, {
      currentStreak,
      longestStreak,
      lastStreakCreditAt: nowUtc,
    });

    return { currentStreak, longestStreak, didIncrementToday: true };
  },
});


const HABIT_CAP_DAYS = 21;      // choose 7, 14, 21, or 28
const MAX_MULTIPLIER = 2;
const BASE_MULTIPLIER = 1;

export const getStreakBonusMultiplier = internalQuery({
  args: { userId: v.id("users") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const currentStreak = Math.max(0, user.currentStreak ?? 0);
    const p = Math.min(1, currentStreak / HABIT_CAP_DAYS); // 0→1 over cap days
    const multiplier = BASE_MULTIPLIER + (MAX_MULTIPLIER - BASE_MULTIPLIER) * p;

    return Number(multiplier.toFixed(3)); // e.g., 1.476
  },
});
