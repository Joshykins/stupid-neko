import { v } from 'convex/values';
import { internal } from './_generated/api';
import { internalMutation, internalQuery } from './_generated/server';
import {
	contentSourceValidator,
	languageCodeValidator,
	mediaTypeValidator,
} from './schema';

export const getByContentKey = internalQuery({
	args: { contentKey: v.string() },
	returns: v.union(
		v.null(),
		v.object({
			_id: v.id('contentLabels'),
			contentKey: v.string(),
			stage: v.union(
				v.literal('queued'),
				v.literal('processing'),
				v.literal('completed'),
				v.literal('failed')
			),
			contentSource: contentSourceValidator,
			contentUrl: v.optional(v.string()),
			contentMediaType: v.optional(mediaTypeValidator),
			title: v.optional(v.string()),
			authorName: v.optional(v.string()),
			authorUrl: v.optional(v.string()),
			description: v.optional(v.string()),
			thumbnailUrl: v.optional(v.string()),
			fullDurationInMs: v.optional(v.number()),
			contentLanguageCode: v.optional(languageCodeValidator),
			languageEvidence: v.optional(v.array(v.string())),
		})
	),
	handler: async (ctx, args) => {
		const label = await (ctx.db as any)
			.query('contentLabels')
			.withIndex('by_content_key', (q: any) =>
				q.eq('contentKey', args.contentKey)
			)
			.unique();
		if (!label) return null;
		// Return only whitelisted fields matching the validator
		return {
			_id: label._id,
			contentKey: label.contentKey,
			stage: label.stage,
			contentSource: label.contentSource,
			contentUrl: label.contentUrl,
			contentMediaType: label.contentMediaType,
			title: label.title,
			authorName: label.authorName,
			authorUrl: label.authorUrl,
			description: label.description,
			thumbnailUrl: label.thumbnailUrl,
			fullDurationInMs: (label as any).fullDurationInMs,
			contentLanguageCode: label.contentLanguageCode,
			languageEvidence: label.languageEvidence,
		} as any;
	},
});

// Base: create or return contentLabel by key and source
export const getOrEnqueue = internalMutation({
	args: v.object({
		contentKey: v.string(), // e.g. "youtube:VIDEO_ID"
		contentSource: contentSourceValidator,
		contentUrl: v.optional(v.string()),
	}),
	returns: v.object({
		contentLabelId: v.id('contentLabels'),
		contentKey: v.string(),
		stage: v.union(
			v.literal('queued'),
			v.literal('processing'),
			v.literal('completed'),
			v.literal('failed')
		),
		existed: v.boolean(),
	}),
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query('contentLabels')
			.withIndex('by_content_key', (q: any) =>
				q.eq('contentKey', args.contentKey)
			)
			.unique();
		if (existing) {
			console.log('[contentLabeling] existing', {
				contentKey: args.contentKey,
				id: existing._id,
				stage: existing.stage,
			});
			return {
				contentLabelId: existing._id,
				contentKey: args.contentKey,
				stage: existing.stage as any,
				existed: true,
			};
		}
		const now = Date.now();
		const contentLabelId = await ctx.db.insert('contentLabels', {
			contentKey: args.contentKey,
			stage: 'queued',
			contentSource: args.contentSource as any,
			contentUrl: args.contentUrl,
			attempts: 0,
			createdAt: now,
			updatedAt: now,
		} as any);
		// Automatically process newly added content labels
		await ctx.scheduler.runAfter(
			0,
			internal.contentLabelActions.processOneContentLabel,
			{
				contentLabelId,
			}
		);
		console.log('[contentLabeling] enqueued', {
			contentKey: args.contentKey,
			contentLabelId,
		});
		return {
			contentLabelId,
			contentKey: args.contentKey,
			stage: 'queued' as const,
			existed: false,
		};
	},
});

// Base: mark processing
export const markProcessing = internalMutation({
	args: v.object({ contentLabelId: v.id('contentLabels') }),
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.contentLabelId, {
			stage: 'processing',
			updatedAt: Date.now(),
		} as any);
		return null;
	},
});

// Base: complete with patch
export const completeWithPatch = internalMutation({
	args: v.object({
		contentLabelId: v.id('contentLabels'),
		patch: v.object({
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
			captionLanguageCodes: v.optional(v.array(languageCodeValidator)), // available captions
			languageEvidence: v.optional(v.array(v.string())), // e.g. ["yt:defaultAudioLanguage", "transcript:fastText"]

			// LLM evaluation (structured + short text)
			targetLanguageEvaluation: v.optional(v.string()), // short summary (rename from targetLanguageLearnigEvaluation)
			targetLanguageEvaluationBullets: v.optional(v.array(v.string())), // brief bullet points (rename)
			// This is the from language code, its often not set, but it could be if the material is targeted something like english speakers learning x language
			contentFromLanguageCode: v.optional(languageCodeValidator),
			eval: v.optional(
				v.object({
					version: v.string(), // schema/versioning
					cefr: v.optional(v.string()), // e.g., "A2-B1"
					speechRateWpm: v.optional(v.number()),
					clarity: v.optional(v.number()), // 1..5
					domainTags: v.optional(v.array(v.string())), // ["news", "daily life"]
					useCases: v.optional(v.array(v.string())), // ["listening practice", "shadowing"]
					hasDirectSubs: v.optional(v.boolean()),
					codeSwitching: v.optional(v.number()), // 0..1
					recommendedLearnerLevels: v.optional(v.array(v.string())), // ["A2","B1"]
				})
			),
		}),
	}),
	returns: v.null(),
	handler: async (ctx, args) => {
		const now = Date.now();
		await ctx.db.patch(args.contentLabelId, {
			...args.patch,
			stage: 'completed',
			processedAt: now,
			updatedAt: now,
		});

		// Kick off batched cleanup by contentKey to avoid large transactional sweeps
		const label = await ctx.db.get(args.contentLabelId);
		const contentKey: string | undefined = (label as any)?.contentKey;
		const contentLanguageCode: any = (label as any)?.contentLanguageCode;
		if (contentKey && contentLanguageCode) {
			await ctx.scheduler.runAfter(
				0,
				internal.contentLabelFunctions.cleanActivitiesForLabel,
				{
					contentKey,
					contentLanguageCode,
					cursor: null,
					limit: 500,
				} as any
			);
		}
		return null;
	},
});

// Batched cleanup of contentActivities for a given contentKey
export const cleanActivitiesForLabel = internalMutation({
	args: v.object({
		contentKey: v.string(),
		contentLanguageCode: languageCodeValidator,
		cursor: v.optional(v.union(v.string(), v.null())),
		limit: v.optional(v.number()),
	}),
	returns: v.null(),
	handler: async (ctx, args) => {
		const page = await ctx.db
			.query('contentActivities')
			.withIndex('by_content_key', (q: any) =>
				q.eq('contentKey', args.contentKey)
			)
			.paginate({
				numItems: Math.max(1, Math.min(1000, args.limit ?? 500)),
				cursor: args.cursor ?? (undefined as any),
			});

		// Build userId set for this page
		const userIds = new Set<string>();
		for (const ev of page.page) userIds.add((ev as any).userId);

		// Load users and their target languages
		const userIdToLanguage = new Map<string, string | undefined>();
		for (const userId of userIds) {
			const user = await ctx.db.get(userId as any);
			const targetId = (user as any)?.currentTargetLanguageId;
			if (!targetId) {
				userIdToLanguage.set(userId, undefined);
				continue;
			}
			const target = await ctx.db.get(targetId);
			userIdToLanguage.set(
				userId,
				(target as any)?.languageCode as string | undefined
			);
		}

		// Delete mismatches (or missing data)
		for (const ev of page.page) {
			const userId = (ev as any).userId as string;
			const lang = userIdToLanguage.get(userId);
			if (!lang || lang !== args.contentLanguageCode) {
				await ctx.db.delete((ev as any)._id);
			}
		}

		if (!page.isDone && page.continueCursor) {
			await ctx.scheduler.runAfter(
				0,
				internal.contentLabelFunctions.cleanActivitiesForLabel,
				{
					contentKey: args.contentKey,
					contentLanguageCode: args.contentLanguageCode,
					cursor: page.continueCursor,
					limit: args.limit ?? 500,
				} as any
			);
		}

		return null;
	},
});

// Base: mark failed
export const markFailed = internalMutation({
	args: v.object({ contentLabelId: v.id('contentLabels'), error: v.string() }),
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.contentLabelId, {
			stage: 'failed',
			lastError: args.error,
			updatedAt: Date.now(),
		} as any);
		return null;
	},
});

// Base: read minimal label details (usable from actions)
export const getLabelBasics = internalQuery({
	args: v.object({ contentLabelId: v.id('contentLabels') }),
	returns: v.object({
		_id: v.id('contentLabels'),
		contentKey: v.optional(v.string()),
		contentUrl: v.optional(v.string()),
	}),
	handler: async (ctx, args) => {
		const doc = await ctx.db.get(args.contentLabelId);
		if (!doc) throw new Error('contentLabel not found');
		return {
			_id: doc._id,
			contentKey: (doc as any).contentKey,
			contentUrl: (doc as any).contentUrl,
		} as any;
	},
});
