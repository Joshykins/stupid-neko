import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

export const processOneContentLabel = internalAction({
	args: v.object({ contentLabelId: v.id("contentLabels") }),
	returns: v.union(
		v.object({
			contentLabelId: v.id("contentLabels"),
			stage: v.literal("completed"),
		}),
		v.object({
			contentLabelId: v.id("contentLabels"),
			stage: v.literal("failed"),
		}),
	),
	handler: async (ctx, args) => {
		const label = await ctx.runQuery(
			internal.contentLabelFunctions.getLabelBasics,
			{ contentLabelId: args.contentLabelId },
		);
		if (!label) throw new Error("contentLabel not found");
		const source = label.contentKey.split(":")[0];
		if (!source) throw new Error("source not found");

		await ctx.runMutation(internal.contentLabelFunctions.markProcessing, {
			contentLabelId: args.contentLabelId,
		});
		// Split by source
		switch (source) {
			case "youtube":
				await ctx.runAction(
					internal.contentLabelYouTubeActions.processOneYoutubeContentLabel,
					{ contentLabelId: args.contentLabelId },
				);
				break;
			default:
				throw new Error("source not supported");
		}

		try {
			await ctx.runMutation(internal.contentLabelFunctions.completeWithPatch, {
				contentLabelId: args.contentLabelId,
				patch: {},
			});
			return {
				contentLabelId: args.contentLabelId,
				stage: "completed",
			} as const;
		} catch (e: any) {
			await ctx.runMutation(internal.contentLabelFunctions.markFailed, {
				contentLabelId: args.contentLabelId,
				error: e?.message ?? "unknown_error",
			});
			return { contentLabelId: args.contentLabelId, stage: "failed" } as const;
		}
	},
});
