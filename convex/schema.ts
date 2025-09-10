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

// Content Source validator
export const ContentSources = ["youtube", "spotify", "anki", "manual"] as const;
export type ContentSource = typeof ContentSources[number];
export const contentSourceValidator = v.union(...ContentSources.map((s) => v.literal(s)));

// Media Types
export const MediaTypes = ["audio", "video", "text"] as const;
export type MediaType = typeof MediaTypes[number];
export const mediaTypeValidator = v.union(...MediaTypes.map((m) => v.literal(m)));


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
		timezone: v.optional(v.string()),
		currentTargetLanguageId: v.optional(v.id("userTargetLanguages")),

		// Streak
		lastStreakCreditAt: v.optional(v.number()),
		currentStreak: v.optional(v.number()), // current consecutive days
		longestStreak: v.optional(v.number()), // longest consecutive days

		
		// Testing
		devDate: v.optional(v.number()),

	})
		.index("email", ["email"]) // mirror default indexes
		.index("phone", ["phone"]),

	streakDays: defineTable({
		userId: v.id("users"),
		day: v.number(),
		numberOfActivities: v.number(),
		minutesLearned: v.optional(v.number()),
	}).index("by_user", ["userId"])
		.index("by_day", ["day"])
		.index("by_user_and_day", ["userId", "day"]),

	userTargetLanguages: defineTable({
		userId: v.id("users"),
		languageCode: v.optional(languageCodeValidator),
		totalMinutesLearning: v.optional(v.number()),
		totalExperience: v.optional(v.number()),
		qualifierFormCurrentLevel: v.optional(v.string()),
	})
		.index("by_user", ["userId"]) 
		.index("by_user_and_language", ["userId", "languageCode"]),

	userTargetLanguageExperiences: defineTable({
		userId: v.id("users"),
		userTargetLanguageId: v.id("userTargetLanguages"),
		languageActivityId: v.optional(v.id("languageActivities")),
		experience: v.optional(v.number()),
	}).index("by_user", ["userId"]),

	userTargetLanguageExperiencesMultipliers: defineTable({
		userId: v.id("users"),
		type: v.union(v.literal("streak")),
		userTargetLanguageId: v.id("userTargetLanguages"),
		userTargetLanguageExperienceId: v.id("userTargetLanguageExperiences"),
		multiplier: v.number(),
	}).index("by_user", ["userId"])
		.index("by_user_and_type", ["userId", "type"])
		.index("by_user_and_user_target_language_experience_id", ["userId", "userTargetLanguageExperienceId"]),

	languageActivities: defineTable({
		userId: v.id("users"),
		userTargetLanguageId: v.id("userTargetLanguages"),
		languageCode: v.optional(languageCodeValidator),
		contentKey: v.optional(v.string()),

		// State
		state: v.union(v.literal("in-progress"), v.literal("completed")), // active: the activity is currently in progress, finished: the activity has been completed

		isManuallyTracked: v.optional(v.boolean()),

		title: v.optional(v.string()),
		description: v.optional(v.string()),

		durationInSeconds: v.optional(v.number()),
		occurredAt: v.optional(v.number()),  
	})
		.index("by_user", ["userId"])
		.index("by_occurred", ["occurredAt"]) 
		.index("by_user_and_occurred", ["userId", "occurredAt"]) 
		.index("by_user_and_state", ["userId", "state"]) 
		.index("by_user_state_and_content_key", ["userId", "state", "contentKey"]),


	

	// Content Activity, these are the heartbeats, starts, pauses, ends, etc of any automated injestion of content
	contentActivities: defineTable({
		userId: v.id("users"),
		contentKey: v.string(), // (will match a contentLabel contentKey) "youtube:VIDEO_ID", "spotify:TRACK_ID" etc.
		activityType: v.union(v.literal("heartbeat"), v.literal("start"), v.literal("pause"), v.literal("end")),
		occurredAt: v.optional(v.number()),
		isWaitingOnLabeling: v.optional(v.boolean()),
		// Translation pipeline bookkeeping
		translated: v.optional(v.boolean()),
		processedAt: v.optional(v.number()),
	}).index("by_user", ["userId"])
		.index("by_user_and_occurred", ["userId", "occurredAt"]) 
		.index("by_content_key", ["contentKey"]),

	// Labeling Engine
	contentLabel: defineTable({
		contentKey: v.string(), // "youtube:VIDEO_ID", "spotify:TRACK_ID"
		stage: v.union(v.literal("queued"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
		contentSource: contentSourceValidator, // "youtube" | "spotify" | "anki" | "manual"
		contentUrl: v.optional(v.string()),
		
		// Normalized metadata (from source APIs)
		contentMediaType: v.optional(mediaTypeValidator), // "audio" | "video" | "text"
		title: v.optional(v.string()),
		authorName: v.optional(v.string()),
		authorUrl: v.optional(v.string()),
		description: v.optional(v.string()),
		thumbnailUrl: v.optional(v.string()),
		fullDurationInSeconds: v.optional(v.number()),
	
		// Language signals
		contentLanguageCode: v.optional(languageCodeValidator), // primary spoken language
		languageEvidence: v.optional(v.array(v.string())), // e.g. ["yt:defaultAudioLanguage", "transcript:fastText"]
	
		// Ops
		attempts: v.optional(v.number()),
		lastError: v.optional(v.string()),
		createdAt: v.optional(v.number()),
		updatedAt: v.optional(v.number()),
		processedAt: v.optional(v.number()),
	}).index("by_content_key", ["contentKey"])
});
