import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";


// Language type
const LanguageCodes = {
	english: "en",
	japanese: "ja",
	spanish: "es",
	french: "fr",
	german: "de",
	korean: "ko",
	italian: "it",
	chinese: "zh",
	hindi: "hi",
	russian: "ru",
	arabic: "ar",
	portuguese: "pt",
	turkish: "tr",
} as const;

export type LanguageCode = typeof LanguageCodes[keyof typeof LanguageCodes];


// Canonical list of supported language codes derived from LanguageTypes
const languagecode = Object.values(LanguageCodes);
export const languageCodeValidator = v.union(
	...languagecode.map((c) => v.literal(c)),
);



// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
	...authTables,
	// Extend users with optional username
	users: defineTable({
		name: v.optional(v.string()),
		image: v.optional(v.string()),
		email: v.optional(v.string()),
		emailVerificationTime: v.optional(v.number()),
		phone: v.optional(v.string()),
		phoneVerificationTime: v.optional(v.number()),
		isAnonymous: v.optional(v.boolean()),
		qualifierFormHeardAboutUsFrom: v.optional(v.string()),
		qualifierFormLearningReason: v.optional(v.string()),
	})
		.index("email", ["email"]) // mirror default indexes
		.index("phone", ["phone"]),

	userTargetLanguages: defineTable({
		userId: v.id("users"),
		languageCode: v.optional(languageCodeValidator),
		totalExperience: v.optional(v.number()),
		qualifierFormCurrentLevel: v.optional(v.string()),
	})
		.index("by_user", ["userId"]) 
		.index("by_user_and_language", ["userId", "languageCode"]),

	userTargetLanguageExperiences: defineTable({
		userId: v.id("users"),
		userLanguageId: v.id("userLanguages"),
		languageCode: v.optional(languageCodeValidator),
		experience: v.optional(v.number()),
	}).index("by_user", ["userId"]),

	trackedItems: defineTable({
		userId: v.id("users"),
		userProgressId: v.id("UserProgress"),
		userTargetLanguageId: v.id("userTargetLanguages"),
		userTargetLanguageExperienceId: v.id("userTargetLanguageExperiences"),

		source: v.optional(v.union(v.literal("youtube"), v.literal("spotify"), v.literal("anki"), v.literal("manual"))),                  // e.g. "youtube","anki","manual"
		contentCategories: v.optional(v.array(v.union(v.literal("audio"), v.literal("video"), v.literal("text"), v.literal("other")))),
		skillCategories: v.optional(v.array(v.union(v.literal("listening"), v.literal("reading"), v.literal("speaking"), v.literal("writing")))),
		isManuallyTracked: v.optional(v.boolean()),

		title: v.optional(v.string()),
		description: v.optional(v.string()),

		durationInSeconds: v.optional(v.number()),
		occurredAt: v.optional(v.number()),  
	})
		.index("by_user", ["userId"])
		.index("by_occurred", ["occurredAt"]) 
		.index("by_user_and_occurred", ["userId", "occurredAt"]),
});
