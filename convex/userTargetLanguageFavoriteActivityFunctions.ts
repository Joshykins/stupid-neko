import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { languageCodeValidator } from "./schema";
import { getEffectiveNow } from "./utils";

export const createFavorite = mutation({
	args: {
		title: v.string(),
		description: v.optional(v.string()),
		externalUrl: v.optional(v.string()),
		defaultDurationInMinutes: v.optional(v.number()),
	},
	returns: v.object({
		favoriteId: v.id("userTargetLanguageFavoriteActivities"),
	}),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Unauthorized");
		const user = await ctx.db.get(userId);
		const utlId = (user as any)?.currentTargetLanguageId as
			| Id<"userTargetLanguages">
			| undefined;
		if (!utlId) throw new Error("No active target language selected");

		const favoriteId = await ctx.db.insert(
			"userTargetLanguageFavoriteActivities",
			{
				userId,
				userTargetLanguageId: utlId,
				title: args.title,
				description: args.description ?? undefined,
				externalUrl: args.externalUrl ?? undefined,
				defaultDurationInMinutes: Math.max(
					0,
					Math.round(args.defaultDurationInMinutes ?? 10),
				),
				createdFromLanguageActivityId: undefined,
				usageCount: 0,
				lastUsedAt: undefined,
			} as any,
		);
		return { favoriteId };
	},
});

export const listFavorites = query({
	args: {},
	returns: v.array(
		v.object({
			_id: v.id("userTargetLanguageFavoriteActivities"),
			_creationTime: v.number(),
			userId: v.id("users"),
			userTargetLanguageId: v.id("userTargetLanguages"),
			title: v.string(),
			description: v.optional(v.string()),
			externalUrl: v.optional(v.string()),
			defaultDurationInMinutes: v.optional(v.number()),
			createdFromLanguageActivityId: v.optional(
				v.id("userTargetLanguageActivities"),
			),
			usageCount: v.optional(v.number()),
			lastUsedAt: v.optional(v.number()),
		}),
	),
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return [];
		const user = await ctx.db.get(userId);
		const utlId = (user as any)?.currentTargetLanguageId as
			| Id<"userTargetLanguages">
			| undefined;
		if (!utlId) return [];
		const favorites = await ctx.db
			.query("userTargetLanguageFavoriteActivities")
			.withIndex("by_user_target_language", (q: any) =>
				q.eq("userTargetLanguageId", utlId),
			)
			.order("desc")
			.collect();
		return favorites as any;
	},
});

export const listManualActivitiesWithFavoriteMatch = query({
	args: {
		limit: v.optional(v.number()),
		cursorOccurredAt: v.optional(v.number()),
	},
	returns: v.object({
		page: v.array(
			v.object({
				_id: v.id("userTargetLanguageActivities"),
				// We intentionally omit _creationTime and other fields to keep payload small
				title: v.optional(v.string()),
				description: v.optional(v.string()),
				externalUrl: v.optional(v.string()),
				durationInSeconds: v.optional(v.number()),
				occurredAt: v.optional(v.number()),
				userTargetLanguageId: v.id("userTargetLanguages"),
				isManuallyTracked: v.optional(v.boolean()),
				matchedFavoriteId: v.optional(
					v.id("userTargetLanguageFavoriteActivities"),
				),
			}),
		),
		isDone: v.boolean(),
		continueCursor: v.optional(v.number()),
	}),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return { page: [], isDone: true, continueCursor: undefined };
		const pageLimit = Math.max(1, Math.min(50, args.limit ?? 20));
		let cursor = args.cursorOccurredAt as number | undefined;
		const page: Array<any> = [];
		const batchSize = Math.max(pageLimit, 25);

		while (page.length < pageLimit) {
			const q = ctx.db
				.query("userTargetLanguageActivities")
				.withIndex("by_user_and_occurred", (q: any) => {
					let qq = q.eq("userId", userId);
					if (typeof cursor === "number") {
						qq = qq.lt("occurredAt", cursor);
					}
					return qq;
				})
				.order("desc");
			const batch = await q.take(batchSize);
			if (batch.length === 0) {
				break;
			}
			for (const it of batch) {
				const occurredAt = (it as any).occurredAt ?? (it as any)._creationTime;
				cursor = occurredAt;
				if (!(it as any).isManuallyTracked) continue;
				const matchedFavoriteId = undefined;
				page.push({
					_id: (it as any)._id,
					title: (it as any).title,
					description: (it as any).description,
					externalUrl: (it as any).externalUrl,
					durationInSeconds: (it as any).durationInSeconds,
					occurredAt,
					userTargetLanguageId: (it as any).userTargetLanguageId,
					isManuallyTracked: (it as any).isManuallyTracked,
					matchedFavoriteId,
				});
				if (page.length >= pageLimit) break;
			}
			if (batch.length < batchSize) {
				break;
			}
		}
		const isDone = page.length < pageLimit;
		const continueCursor =
			page.length > 0 ? (page[page.length - 1] as any).occurredAt : undefined;
		return { page, isDone, continueCursor } as any;
	},
});

export const addFavoriteFromActivity = mutation({
	args: {
		activityId: v.id("userTargetLanguageActivities"),
		isFavorite: v.boolean(),
	},
	returns: v.object({
		favoriteId: v.optional(v.id("userTargetLanguageFavoriteActivities")),
		isFavorite: v.boolean(),
	}),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Unauthorized");
		const act = await ctx.db.get(args.activityId);
		if (!act) throw new Error("Activity not found");
		if ((act as any).userId !== userId) throw new Error("Forbidden");
		if (!(act as any).isManuallyTracked)
			throw new Error("Only manual activities can be favorited");

		const utlId = (act as any)
			.userTargetLanguageId as Id<"userTargetLanguages">;
		const title = ((act as any).title ?? "").trim();
		if (!title) throw new Error("Activity missing title");

		// Look for existing favorite by title
		const existing = await ctx.db
			.query("userTargetLanguageFavoriteActivities")
			.withIndex("by_user_target_language", (q: any) =>
				q.eq("userTargetLanguageId", utlId),
			)
			.collect();
		const match = existing.find(
			(f: any) => (f.title ?? "").trim().toLowerCase() === title.toLowerCase(),
		);

		if (args.isFavorite) {
			const favoriteId =
				(match?._id as
					| Id<"userTargetLanguageFavoriteActivities">
					| undefined) ??
				(await ctx.db.insert("userTargetLanguageFavoriteActivities", {
					userId,
					userTargetLanguageId: utlId,
					title: (act as any).title ?? "",
					description: (act as any).description ?? undefined,
					externalUrl: (act as any).externalUrl ?? undefined,
					defaultDurationInMinutes: Math.max(
						0,
						Math.round(((act as any).durationInSeconds ?? 0) / 60),
					),
					createdFromLanguageActivityId: (act as any)._id,
					usageCount: 0,
					lastUsedAt: undefined,
				} as any));
			return { favoriteId, isFavorite: true };
		} else {
			// Optional: Do not delete the favorite document automatically to avoid surprising removals across other activities.
			return { favoriteId: undefined, isFavorite: false };
		}
	},
});

export const quickCreateFromFavorite = mutation({
	args: {
		favoriteId: v.id("userTargetLanguageFavoriteActivities"),
		durationInMinutes: v.optional(v.number()),
		occurredAt: v.optional(v.number()),
	},
	returns: v.object({ activityId: v.id("userTargetLanguageActivities") }),
	handler: async (
		ctx,
		args,
	): Promise<{ activityId: Id<"userTargetLanguageActivities"> }> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Unauthorized");
		const fav = await ctx.db.get(args.favoriteId);
		if (!fav) throw new Error("Favorite not found");
		if ((fav as any).userId !== userId) throw new Error("Forbidden");

		const utlId = (fav as any)
			.userTargetLanguageId as Id<"userTargetLanguages">;
		const now = await getEffectiveNow(ctx);
		const occurredAt = args.occurredAt ?? now;

		const durationInMinutes = Math.max(
			0,
			Math.round(
				args.durationInMinutes ?? (fav as any).defaultDurationInMinutes ?? 10,
			),
		);

		const user = await ctx.db.get(userId);
		const utl = await ctx.db.get(utlId);
		const languageCode = (utl as any)?.languageCode;

		const created = await ctx.runMutation(
			internal.userTargetLanguageActivityFunctions.addLanguageActivity,
			{
				userTargetLanguageId: utlId,
				title: (fav as any).title ?? "",
				description: (fav as any).description ?? undefined,
				durationInMinutes,
				occurredAt,
				isManuallyTracked: true,
				languageCode,
				favoriteLanguageActivityId: (fav as any)._id,
			} as any,
		);

		// Update usage metrics
		await ctx.db.patch(args.favoriteId, {
			usageCount: Math.max(0, ((fav as any).usageCount ?? 0) + 1),
			lastUsedAt: occurredAt,
		} as any);
		const activityId = (
			created as { activityId: Id<"userTargetLanguageActivities"> }
		).activityId;
		return { activityId };
	},
});

export const updateFavorite = mutation({
	args: {
		favoriteId: v.id("userTargetLanguageFavoriteActivities"),
		title: v.optional(v.string()),
		description: v.optional(v.string()),
		externalUrl: v.optional(v.string()),
		defaultDurationInMinutes: v.optional(v.number()),
	},
	returns: v.object({ updated: v.boolean() }),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Unauthorized");
		const fav = await ctx.db.get(args.favoriteId);
		if (!fav) throw new Error("Favorite not found");
		if ((fav as any).userId !== userId) throw new Error("Forbidden");

		const patch: Record<string, any> = {};
		if (typeof args.title !== "undefined") patch.title = args.title;
		if (typeof args.description !== "undefined")
			patch.description = args.description;
		if (typeof args.externalUrl !== "undefined")
			patch.externalUrl = args.externalUrl;
		if (typeof args.defaultDurationInMinutes !== "undefined")
			patch.defaultDurationInMinutes = Math.max(
				0,
				Math.round(args.defaultDurationInMinutes),
			);

		await ctx.db.patch(args.favoriteId, patch as any);
		return { updated: true };
	},
});

export const deleteFavorite = mutation({
	args: { favoriteId: v.id("userTargetLanguageFavoriteActivities") },
	returns: v.object({ deleted: v.boolean() }),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Unauthorized");
		const fav = await ctx.db.get(args.favoriteId);
		if (!fav) return { deleted: false };
		if ((fav as any).userId !== userId) throw new Error("Forbidden");
		await ctx.db.delete(args.favoriteId);
		return { deleted: true };
	},
});
