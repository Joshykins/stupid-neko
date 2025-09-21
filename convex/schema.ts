import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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

export type LanguageCode = (typeof LanguageCodes)[keyof typeof LanguageCodes];

// Canonical list of supported language codes derived from LanguageTypes
const languagecode = Object.values(LanguageCodes);
export const languageCodeValidator = v.union(
	...languagecode.map((c) => v.literal(c)),
);

// Content Source validator
export const ContentSources = ["youtube", "spotify", "anki", "manual"] as const;
export type ContentSource = (typeof ContentSources)[number];
export const contentSourceValidator = v.union(
	...ContentSources.map((s) => v.literal(s)),
);

// Media Types
export const MediaTypes = ["audio", "video", "text"] as const;
export type MediaType = (typeof MediaTypes)[number];
export const mediaTypeValidator = v.union(
	...MediaTypes.map((m) => v.literal(m)),
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
		timezone: v.optional(v.string()),
		currentTargetLanguageId: v.optional(v.id("userTargetLanguages")),
		// UI preferences
		streakDisplayMode: v.optional(
			v.union(v.literal("grid"), v.literal("week")),
		),

		// Extension integration key
		integrationKey: v.optional(v.string()),
		integrationKeyUsedByPlugin: v.optional(v.boolean()),

		// Streak
		lastStreakCreditAt: v.optional(v.number()),
		currentStreak: v.optional(v.number()), // current consecutive days
		longestStreak: v.optional(v.number()), // longest consecutive days

		// Testing
		devDate: v.optional(v.number()),

		// Pre-release access gate
		preReleaseGranted: v.optional(v.boolean()),
	})
		.index("by_email", ["email"]) // mirror default indexes
		.index("by_phone", ["phone"])
		.index("by_integration_key", ["integrationKey"]),

	userStreakDays: defineTable({
		userId: v.id("users"),
		dayStartMs: v.number(),
		trackedMs: v.number(),
		xpGained: v.number(),
		credited: v.boolean(),
		creditedKind: v.optional(
			v.union(v.literal("activity"), v.literal("vacation")),
		),
		streakLength: v.number(),
		lastEventAtMs: v.number(),
		autoVacationAppliedAtMs: v.optional(v.number()),
		note: v.optional(v.string()),
	})
		.index("by_user_and_day", ["userId", "dayStartMs"])
		.index("by_user", ["userId"]),

	userStreakDayLedgers: defineTable({
		userId: v.id("users"),
		dayStartMs: v.number(),
		occurredAt: v.number(),
		reason: v.union(
			v.literal("activity_minutes"),
			v.literal("xp_delta"),
			v.literal("credit_activity"),
			v.literal("credit_vacation"),
			v.literal("uncredit"),
		),
		minutesDeltaMs: v.optional(v.number()),
		xpDelta: v.optional(v.number()),
		streakLengthAfter: v.optional(v.number()),
		source: v.optional(v.union(v.literal("user"), v.literal("system_nudge"))),
		note: v.optional(v.string()),
	})
		.index("by_user_and_day", ["userId", "dayStartMs"])
		.index("by_user_and_occurred", ["userId", "occurredAt"]),

	userStreakVacationLedgers: defineTable({
		userId: v.id("users"),
		occurredAt: v.number(),
		reason: v.union(v.literal("grant"), v.literal("use")),
		delta: v.number(),
		newTotal: v.number(),
		coveredDayStartMs: v.optional(v.number()),
		source: v.optional(v.union(v.literal("manual"), v.literal("auto_nudge"))),
		note: v.optional(v.string()),
	})
		.index("by_user", ["userId"])
		.index("by_user_and_occurred", ["userId", "occurredAt"]),

	userTargetLanguages: defineTable({
		userId: v.id("users"),
		languageCode: v.optional(languageCodeValidator),
		totalMsLearning: v.optional(v.number()),
		qualifierFormCurrentLevel: v.optional(v.string()),
	})
		.index("by_user", ["userId"])
		.index("by_user_and_language", ["userId", "languageCode"]),

	userTargetLanguageExperienceLedgers: defineTable({
		userId: v.id("users"),
		userTargetLanguageId: v.id("userTargetLanguages"),
		languageActivityId: v.optional(v.id("userTargetLanguageActivities")),
		// Event-sourced ledger fields
		deltaExperience: v.number(),
		baseExperience: v.optional(v.number()),
		runningTotalAfter: v.number(),
		occurredAt: v.optional(v.number()),
		note: v.optional(v.string()),
		multipliers: v.optional(
			v.array(
				v.object({
					type: v.union(v.literal("streak")),
					value: v.number(),
				}),
			),
		),
		// Level snapshot fields at time of this ledger event
		previousLevel: v.number(),
		newLevel: v.number(),
		levelsGained: v.number(),
		remainderTowardsNextLevel: v.number(),
		nextLevelCost: v.number(),
		lastLevelCost: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_user_target_language", ["userTargetLanguageId"])
		.index("by_language_activity", ["languageActivityId"]),

	// User favorited manual activity templates
	userTargetLanguageFavoriteActivities: defineTable({
		userId: v.id("users"),
		userTargetLanguageId: v.id("userTargetLanguages"),
		title: v.string(),
		description: v.optional(v.string()),
		externalUrl: v.optional(v.string()),
		defaultDurationInMs: v.optional(v.number()),
		contentCategories: v.optional(
			v.array(
				v.union(
					v.literal("audio"),
					v.literal("video"),
					v.literal("text"),
					v.literal("other"),
				),
			),
		),
		createdFromLanguageActivityId: v.optional(
			v.id("userTargetLanguageActivities"),
		),
		usageCount: v.optional(v.number()),
		lastUsedAt: v.optional(v.number()),
	})
		.index("by_user", ["userId"])
		.index("by_user_target_language", ["userTargetLanguageId"])
		.index("by_user_target_language_and_title", [
			"userTargetLanguageId",
			"title",
		]),

	userTargetLanguageActivities: defineTable({
		userId: v.id("users"),
		userTargetLanguageId: v.id("userTargetLanguages"),
		languageCode: v.optional(languageCodeValidator),
		contentKey: v.optional(v.string()),
		externalUrl: v.optional(v.string()),

		// State
		state: v.union(v.literal("in-progress"), v.literal("completed")), // active: the activity is currently in progress, finished: the activity has been completed

		isManuallyTracked: v.optional(v.boolean()),

		title: v.optional(v.string()),
		description: v.optional(v.string()),

		// Canonical duration in milliseconds
		durationInMs: v.optional(v.number()),
		occurredAt: v.optional(v.number()),
	})
		.index("by_user", ["userId"])
		.index("by_user_and_occurred", ["userId", "occurredAt"])
		.index("by_user_and_state", ["userId", "state"])
		.index("by_user_state_and_content_key", ["userId", "state", "contentKey"]),

	// Content Activity, these are the heartbeats, starts, pauses, ends, etc of any automated injestion of content
	contentActivities: defineTable({
		userId: v.id("users"),
		contentKey: v.string(), // (will match a contentLabel contentKey) "youtube:VIDEO_ID", "spotify:TRACK_ID" etc.
		activityType: v.union(
			v.literal("heartbeat"),
			v.literal("start"),
			v.literal("pause"),
			v.literal("end"),
		),
		occurredAt: v.optional(v.number()),
		isWaitingOnLabeling: v.optional(v.boolean()),
		// Translation pipeline bookkeeping
		translated: v.optional(v.boolean()),
		processedAt: v.optional(v.number()),
	})
		.index("by_user", ["userId"])
		.index("by_user_and_occurred", ["userId", "occurredAt"])
		.index("by_content_key", ["contentKey"]),

	// Labeling Engine
	contentLabels: defineTable({
		contentKey: v.string(), // "youtube:VIDEO_ID", "spotify:TRACK_ID", "website:URL"
		stage: v.union(
			v.literal("queued"),
			v.literal("processing"),
			v.literal("completed"),
			v.literal("failed"),
		),
		contentSource: contentSourceValidator, // "youtube" | "spotify" | "anki" | "manual"
		contentUrl: v.optional(v.string()),

		// Normalized metadata (from source APIs)
		contentMediaType: v.optional(mediaTypeValidator), // "audio" | "video" | "text"
		title: v.optional(v.string()),
		authorName: v.optional(v.string()),
		authorUrl: v.optional(v.string()),
		description: v.optional(v.string()),
		thumbnailUrl: v.optional(v.string()),
		fullDurationInMs: v.optional(v.number()),

		// Language signals
		contentLanguageCode: v.optional(languageCodeValidator), // primary spoken language
		languageEvidence: v.optional(v.array(v.string())), // e.g. ["yt:defaultAudioLanguage", "transcript:fastText"]

		// Ops
		attempts: v.optional(v.number()),
		lastError: v.optional(v.string()),
		createdAt: v.optional(v.number()),
		updatedAt: v.optional(v.number()),
		processedAt: v.optional(v.number()),
	}).index("by_content_key", ["contentKey"]),

	// Spotify OAuth linkage and token storage
	spotifyAccounts: defineTable({
		userId: v.id("users"),
		spotifyUserId: v.optional(v.string()),
		displayName: v.optional(v.string()),
		accessToken: v.string(),
		refreshToken: v.string(),
		expiresAt: v.number(),
		tokenType: v.optional(v.string()),
		scope: v.optional(v.string()),
		status: v.optional(v.union(v.literal("connected"), v.literal("error"))),
		lastError: v.optional(v.string()),
		createdAt: v.optional(v.number()),
		updatedAt: v.optional(v.number()),
	})
		.index("by_user", ["userId"])
		.index("by_spotify_user", ["spotifyUserId"]),

	// Ephemeral OAuth states for callback CSRF and mapping to user
	spotifyAuthStates: defineTable({
		state: v.string(),
		userId: v.id("users"),
		createdAt: v.number(),
		redirectTo: v.optional(v.string()),
	})
		.index("by_state", ["state"])
		.index("by_user", ["userId"]),

	// Pre-release single-use codes for early access
	preReleaseCodes: defineTable({
		code: v.string(),
		normalizedCode: v.string(),
		message: v.optional(v.string()),
		used: v.boolean(),
		usedByUserId: v.optional(v.id("users")),
		usedAt: v.optional(v.number()),
		createdByUserId: v.optional(v.id("users")),
	})
		.index("by_code", ["code"])
		.index("by_normalized_code", ["normalizedCode"])
		.index("by_user", ["usedByUserId"]),
});
