import { cronJobs } from 'convex/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { internalAction } from './_generated/server';

const crons = cronJobs();



// Hourly vacation enforcement via streak nudge mimicking TestingComponent behavior
export const hourlyNudge = internalAction({
	args: {},
	returns: v.null(),
	handler: async ctx => {
		const users = await ctx.runQuery(
			internal.userFunctions.listAllUsersForCron,
			{}
		);
		// Small batches to keep within action time; rely on hourly cadence for coverage
		const batch = users.slice(0, 250);
		for (const u of batch) {
			const now = (u as any).devDate ?? Date.now();
			await ctx.runMutation(internal.userStreakFunctions.nudgeUserStreakMutation, {
				userId: u._id,
				now,
			});
		}
		return null;
	},
});

// Process stale in-progress activities every 5 minutes
export const processStaleActivities = internalAction({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const batchSize = 250;
		console.log(`Processing stale activities at ${Date.now()}`);
		
		const staleActivities = await ctx.runQuery(
			internal.userTargetLanguageActivityFunctions.listStaleInProgressActivities,
			{ batchSize }
		);

		let completed = 0;
		let deleted = 0;
		let skipped = 0;

		for (const activity of staleActivities) {
			const result = await ctx.runMutation(
				internal.userTargetLanguageActivityFunctions.processStaleActivity,
				{ activityId: activity._id }
			);
			
			if (result.action === 'completed') completed++;
			else if (result.action === 'deleted') deleted++;
			else skipped++;
		}

		console.log(`Processed ${staleActivities.length} stale activities: ${completed} completed, ${deleted} deleted, ${skipped} skipped`);
		return null;
	},
});

crons.interval(
	'hourly streak nudge',
	{ hours: 1 },
	internal.crons.hourlyNudge,
	{}
);

crons.interval(
	'process stale activities',
	{ minutes: 1 },
	internal.crons.processStaleActivities,
	{}
);

export default crons;
