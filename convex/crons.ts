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


