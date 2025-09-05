import { internal } from "./_generated/api";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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
    // Normalize to start of day for consistent day-based grouping
    const dayStart = Math.floor(nowUtc / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000);
    
    // Count activities that occurred on this specific day
    const dayEnd = dayStart + (24 * 60 * 60 * 1000) - 1; // End of day (23:59:59.999)
    const activitiesOnThisDay = await ctx.db
      .query("languageActivities")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        q.and(
          q.gte(q.field("occurredAt"), dayStart),
          q.lte(q.field("occurredAt"), dayEnd)
        )
      )
      .collect();

    // Check if we already have a record for this day
    const existingDay = await ctx.db
      .query("streakDays")
      .withIndex("by_user_and_day", (q) => q.eq("userId", args.userId).eq("day", dayStart))
      .first();

    if (existingDay) {
      // Update existing record
      await ctx.db.patch(existingDay._id, {
        numberOfActivities: activitiesOnThisDay.length,
      });
    } else {
      // Insert new record
      await ctx.db.insert("streakDays", {
        userId: args.userId,
        day: dayStart,
        numberOfActivities: activitiesOnThisDay.length,
      });
    }

    return { numberOfActivities: activitiesOnThisDay.length };
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


    // Update streak days
    await ctx.runMutation(internal.streakFunctions.updateStreakDays, {
      userId: args.userId,
      occurredAt: nowUtc,
    });

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

      
    } else {
      // Missed the window + grace: streak resets
      currentStreak = 1;
      longestStreak = Math.max(longestStreak, currentStreak);

     
     
    }

    await ctx.db.patch(args.userId, {
      currentStreak,
      longestStreak,
      lastStreakCreditAt: nowUtc,
    });
    return { currentStreak, longestStreak, didIncrementToday: true };
  },
});


import { calculateStreakBonusMultiplier, HABIT_CAP_DAYS } from "../lib/streakBonus";

export const getStreakBonusMultiplier = internalQuery({
  args: { userId: v.id("users") },
  returns: v.number(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const currentStreak = Math.max(0, user.currentStreak ?? 0);
    const multiplier = calculateStreakBonusMultiplier(currentStreak);
    return multiplier; // e.g., 1.476
  },
});

export const getStreakDataForHeatmap = query({
  args: {
    days: v.optional(v.number()),
  },
  returns: v.union(
    v.object({
      values: v.array(v.number()),
      activityCounts: v.array(v.number()),
      currentStreak: v.number(),
      longestStreak: v.number(),
      totalDays: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (!userId) return null;

      const days = args.days ?? 365;
      const now = Date.now();
      const startDate = new Date(now - (days - 1) * 24 * 60 * 60 * 1000);
      const startDay = Math.floor(startDate.getTime() / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000);

      // Get user's streak information
      const user = await ctx.db.get(userId);
      if (!user) return null;

      const currentStreak = user.currentStreak ?? 0;
      const longestStreak = user.longestStreak ?? 0;

      // Get all streak days for the user
      const streakDays = await ctx.db
        .query("streakDays")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      // Create a map of day -> numberOfActivities
      const dayToActivities = new Map<number, number>();
      for (const streakDay of streakDays) {
        dayToActivities.set(streakDay.day, streakDay.numberOfActivities);
      }

      // Generate the values array for the heatmap
      const values: number[] = [];
      const activityCounts: number[] = [];
      for (let i = 0; i < days; i++) {
        const dayTimestamp = startDay + i * 24 * 60 * 60 * 1000;
        const activities = dayToActivities.get(dayTimestamp) ?? 0;
        
        // Store the actual activity count
        activityCounts.push(activities);
        
        // Convert number of activities to heatmap intensity (0-4)
        let intensity = 0;
        if (activities > 0) {
          if (activities === 1) intensity = 1;
          else if (activities === 2) intensity = 2;
          else if (activities <= 4) intensity = 3;
          else intensity = 4;
        }
        
        values.push(intensity);
      }

      return {
        values,
        activityCounts,
        currentStreak,
        longestStreak,
        totalDays: days,
      };
    } catch (error) {
      // Return null for any errors (including unauthorized)
      return null;
    }
  },
});
