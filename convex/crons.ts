import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

const crons = cronJobs();

// Ensure the function reference exists in this module for stronger linking in dev
export const tick = internalAction({
    args: {},
    returns: v.null(),
    handler: async (ctx) => {
        await ctx.runMutation(internal.languageActivitiyFromContentActivitiesFunctions.translateBatch, {
            limit: 500,
        });
        // Nudge all users once per tick (bounded)
        const users = await ctx.runQuery(internal.users.listAllUsersForCron, {});
        const now = Date.now();
        for (const u of users.slice(0, 100)) {
            await ctx.runMutation(internal.streakFunctions.nudgeUserStreak, { userId: u._id, now });
        }
        return null;
    },
});

// Hourly vacation enforcement via streak nudge mimicking TestingComponent behavior
export const hourlyNudge = internalAction({
    args: {},
    returns: v.null(),
    handler: async (ctx) => {
        const users = await ctx.runQuery(internal.users.listAllUsersForCron, {});
        // Small batches to keep within action time; rely on hourly cadence for coverage
        const batch = users.slice(0, 250);
        for (const u of batch) {
            const now = (u as any).devDate ?? Date.now();
            await ctx.runMutation(internal.streakFunctions.nudgeUserStreak, { userId: u._id, now });
        }
        return null;
    },
});

crons.interval(
    "translate content activities",
    { seconds: 30 },
    internal.crons.tick,
    {},
);

crons.interval(
    "hourly streak nudge",
    { hours: 1 },
    internal.crons.hourlyNudge,
    {},
);

export default crons;


