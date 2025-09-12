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

crons.interval(
    "translate content activities",
    { seconds: 30 },
    internal.crons.tick,
    {},
);

export default crons;


