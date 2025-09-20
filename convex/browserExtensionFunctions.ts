import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { contentSourceValidator, languageCodeValidator } from "./schema";

async function resolveUserId(
	ctx: any,
	integrationId: string,
): Promise<Id<"users">> {
	const match = await ctx.runQuery(
		internal.integrationKeyFunctions.getUserByIntegrationKey,
		{ integrationId },
	);
	if (!match?.userId) throw new Error("Unauthorized");
	return match.userId as Id<"users">;
}

export const meFromIntegration = query({
	args: { integrationId: v.string() },
	returns: v.union(
		v.object({
			name: v.optional(v.string()),
			email: v.optional(v.string()),
			image: v.optional(v.string()),
			timezone: v.optional(v.string()),
			languageCode: v.optional(v.string()),
		}),
		v.null(),
	),
	handler: async (ctx, args) => {
		const userId = await resolveUserId(ctx, args.integrationId);
		const user = await ctx.db.get(userId as any);
		if (!user) return null;
		const currentTargetLanguageId = (user as any)?.currentTargetLanguageId as
			| Id<"userTargetLanguages">
			| undefined;
		if (!currentTargetLanguageId)
			throw new Error("Current target language not found");
		const tl = await ctx.db.get(currentTargetLanguageId);
		return {
			name: (user as any).name ?? undefined,
			email: (user as any).email ?? undefined,
			image: (user as any).image ?? undefined,
			timezone: (user as any).timezone ?? undefined,
			languageCode: (tl as any)?.languageCode ?? undefined,
		};
	},
});

export const recordContentActivityFromIntegration = mutation({
	args: {
		integrationId: v.string(),
		source: contentSourceValidator,
		activityType: v.union(
			v.literal("heartbeat"),
			v.literal("start"),
			v.literal("pause"),
			v.literal("end"),
		),
		contentKey: v.string(),
		url: v.optional(v.string()),
		occurredAt: v.optional(v.number()),
	},
	returns: v.object({
		ok: v.boolean(),
		saved: v.boolean(),
		contentActivityId: v.optional(v.id("contentActivities")),
		contentLabelId: v.optional(v.id("contentLabels")),
		isWaitingOnLabeling: v.optional(v.boolean()),
		reason: v.optional(v.string()),
		contentKey: v.optional(v.string()),
		contentLabel: v.optional(v.any()),
		currentTargetLanguage: v.optional(
			v.union(
				v.object({ languageCode: v.optional(languageCodeValidator) }),
				v.null(),
			),
		),
	}),
	handler: async (
		ctx,
		args,
	): Promise<{
		ok: boolean;
		saved: boolean;
		contentActivityId?: Id<"contentActivities">;
		contentLabelId?: Id<"contentLabels">;
		isWaitingOnLabeling?: boolean;
		reason?: string;
		contentKey?: string;
		contentLabel?: any;
		currentTargetLanguage?: {
			languageCode?: import("./schema").LanguageCode;
		} | null;
	}> => {
		const { integrationId, ...rest } = args as any;
		const userId = await resolveUserId(ctx, integrationId);
		const result:
			| {
					ok: true;
					saved: boolean;
					contentActivityId?: Id<"contentActivities">;
					contentLabelId?: Id<"contentLabels">;
					isWaitingOnLabeling?: boolean;
					reason?: string;
					contentKey?: string;
			  }
			| {
					ok: true;
					saved: false;
					reason?: string;
					contentKey?: string;
					contentLabelId?: Id<"contentLabels">;
			  } = await ctx.runMutation(
			internal.contentActivityFunctions.recordContentActivity,
			{ userId, ...rest } as any,
		);
		let contentLabel: any = null;
		try {
			if (result?.contentKey) {
				contentLabel = await ctx.runQuery(
					internal.contentLabelFunctions.getByContentKey,
					{ contentKey: result.contentKey },
				);
			}
		} catch {}
		let currentTargetLanguage: any = null;
		try {
			currentTargetLanguage = await ctx.runQuery(
				internal.userFunctions.getCurrentTargetLanguage,
				{ userId },
			);
		} catch {}
		return { ...(result as any), contentLabel, currentTargetLanguage } as any;
	},
});
