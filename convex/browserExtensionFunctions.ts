import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id, Doc } from "./_generated/dataModel";
import {
	mutation,
	query,
	type QueryCtx,
	type MutationCtx,
} from "./_generated/server";
import { contentSourceValidator, languageCodeValidator } from "./schema";

async function resolveUserId(
	ctx: QueryCtx,
	integrationId: string,
): Promise<Id<"users">> {
	const user = (await ctx.runQuery(
		internal.integrationKeyFunctions.getUserByIntegrationKey,
		{ integrationId },
	)) as Doc<"users"> | null;
	if (!user) throw new Error("Unauthorized");
	return user._id;
}

async function resolveUserIdAndMarkUsed(
	ctx: MutationCtx,
	integrationId: string,
): Promise<Id<"users">> {
	const user = (await ctx.runQuery(
		internal.integrationKeyFunctions.getUserByIntegrationKey,
		{ integrationId },
	)) as any;
	if (!user) throw new Error("Unauthorized");

	// Only mark as used if not already set
	if (!user.integrationKeyUsedByPlugin) {
		await ctx.runMutation(
			internal.integrationKeyFunctions.markIntegrationKeyAsUsed,
			{ integrationId },
		);
	}

	return user._id;
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
		const user = await ctx.db.get(userId);
		if (!user) return null;
		const currentTargetLanguageId = user.currentTargetLanguageId;
		if (!currentTargetLanguageId)
			throw new Error("Current target language not found");
		const tl = await ctx.db.get(currentTargetLanguageId);
		return {
			name: user.name ?? undefined,
			email: user.email ?? undefined,
			image: user.image ?? undefined,
			timezone: user.timezone ?? undefined,
			languageCode: tl?.languageCode ?? undefined,
		};
	},
});

export const markIntegrationKeyAsUsedFromExtension = mutation({
	args: { integrationId: v.string() },
	returns: v.object({ success: v.boolean() }),
	handler: async (ctx, args) => {
		const user = (await ctx.runQuery(
			internal.integrationKeyFunctions.getUserByIntegrationKey,
			{ integrationId: args.integrationId },
		)) as Doc<"users"> | null;

		if (!user) {
			return { success: false };
		}

		// Only mark as used if not already set
		if (!user.integrationKeyUsedByPlugin) {
			await ctx.runMutation(
				internal.integrationKeyFunctions.markIntegrationKeyAsUsed,
				{ integrationId: args.integrationId },
			);
		}

		return { success: true };
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
		contentLabel?: unknown;
		currentTargetLanguage?: {
			languageCode?: import("./schema").LanguageCode;
		} | null;
	}> => {
		const { integrationId, ...rest } = args;
		const userId = await resolveUserIdAndMarkUsed(ctx, integrationId);
		const result = await ctx.runMutation(
			internal.contentActivityFunctions.recordContentActivity,
			{ userId, ...rest },
		);
		let contentLabel = null;
		try {
			if (result?.contentKey) {
				contentLabel = await ctx.runQuery(
					internal.contentLabelFunctions.getByContentKey,
					{ contentKey: result.contentKey },
				);
			}
		} catch {}
		let currentTargetLanguage = null;
		try {
			currentTargetLanguage = await ctx.runQuery(
				internal.userFunctions.getCurrentTargetLanguage,
				{ userId },
			);
		} catch {}
		return { ...result, contentLabel, currentTargetLanguage };
	},
});
