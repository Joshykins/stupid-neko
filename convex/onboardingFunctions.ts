import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { type LanguageCode, languageCodeValidator } from "./schema";

export const needsOnboarding = query({
	args: {},
	returns: v.boolean(),
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return true;
		const user = await ctx.db.get(userId);
		if (!user) return true;
		const heard: unknown = (user as any).qualifierFormHeardAboutUsFrom;
		return heard === null || heard === undefined || heard === "";
	},
});

export const completeOnboarding = mutation({
	args: {
		targetLanguageCode: languageCodeValidator,
		qualifierFormHeardAboutUsFrom: v.optional(v.string()),
		qualifierFormLearningReason: v.optional(v.string()),
		qualifierFormCurrentLevel: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Unauthorized");

		// Persist to users table
		await ctx.db.patch(userId, {
			...(args.qualifierFormHeardAboutUsFrom !== undefined
				? {
						qualifierFormHeardAboutUsFrom:
							args.qualifierFormHeardAboutUsFrom || undefined,
					}
				: {}),
			...(args.qualifierFormLearningReason !== undefined
				? {
						qualifierFormLearningReason:
							args.qualifierFormLearningReason || undefined,
					}
				: {}),
		} as any);

		// Upsert userTargetLanguages for (userId, language)
		const allowed: Array<LanguageCode> = [
			"en",
			"ja",
			"es",
			"fr",
			"de",
			"ko",
			"it",
			"zh",
			"hi",
			"ru",
			"ar",
			"pt",
			"tr",
		];
		if (!allowed.includes(args.targetLanguageCode as LanguageCode)) {
			throw new Error("Unsupported language code");
		}

		const existing = await ctx.db
			.query("userTargetLanguages")
			.withIndex("by_user_and_language", (q: any) =>
				q
					.eq("userId", userId as any)
					.eq("languageCode", args.targetLanguageCode),
			)
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, {
				languageCode: args.targetLanguageCode,
				qualifierFormCurrentLevel: args.qualifierFormCurrentLevel ?? undefined,
			} as any);
			// Ensure user's currentTargetLanguageId is set to this target
			await ctx.db.patch(userId, {
				currentTargetLanguageId: existing._id,
			} as any);
		} else {
			const newTargetId = await ctx.db.insert("userTargetLanguages", {
				userId,
				languageCode: args.targetLanguageCode,
				qualifierFormCurrentLevel: args.qualifierFormCurrentLevel ?? undefined,
			} as any);
			await ctx.db.patch(userId, {
				currentTargetLanguageId: newTargetId,
			} as any);
		}

		return null;
	},
});
