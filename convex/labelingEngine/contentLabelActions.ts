import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { internalAction, internalMutation } from '../_generated/server';
import * as YouTubeProcessing from './integrations/youtubeProcessing';
import * as WebsiteProcessing from './integrations/websiteProcessing';
import dayjs from '../../lib/dayjs';
import { tryCatch } from '../../lib/tryCatch';
import { languageCodeValidator } from '../schema';

// Define proper validators for the patch object
const contentLabelPatchValidator = v.object({
	contentUrl: v.optional(v.string()),
	contentMediaType: v.optional(v.union(
		v.literal('audio'),
		v.literal('video'),
		v.literal('text')
	)),
	title: v.optional(v.string()),
	authorName: v.optional(v.string()),
	authorUrl: v.optional(v.string()),
	description: v.optional(v.string()),
	thumbnailUrl: v.optional(v.string()),
	fullDurationInMs: v.optional(v.number()),
	contentLanguageCode: v.optional(languageCodeValidator),
	languageEvidence: v.optional(v.array(v.string())),
});


// Base: mark processing
export const markProcessing = internalMutation({
	args: v.object({ contentLabelId: v.id('contentLabels') }),
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.contentLabelId, {
			stage: 'processing',
			updatedAt: dayjs().valueOf(),
		});
		return null;
	},
});


// Consolidated mutation that handles the entire content label processing in a single transaction
export const processContentLabelTransaction = internalMutation({
	args: v.object({
		contentLabelId: v.id('contentLabels'),
		success: v.boolean(),
		patch: v.optional(contentLabelPatchValidator),
		error: v.optional(v.string()),
	}),
	returns: v.null(),
	handler: async (ctx, args) => {
		const now = dayjs().valueOf();

		if (args.success) {
			// Complete the processing successfully
			await ctx.db.patch(args.contentLabelId, {
				...args.patch,
				stage: 'completed',
				processedAt: now,
				updatedAt: now,
			});

			// Update language activities when labeling completes
			if (args.patch?.contentLanguageCode) {
				// Get the contentKey from the label
				const label = await ctx.db.get(args.contentLabelId);
				if (label?.contentKey) {
					await ctx.scheduler.runAfter(
						0,
						internal.userTargetLanguageActivityFunctions.updateLanguageActivitiesForContentLabel,
						{
							contentKey: label.contentKey,
							contentLanguageCode: args.patch.contentLanguageCode,
						}
					);
				}
			}
		} else {
			// Mark as failed
			await ctx.db.patch(args.contentLabelId, {
				stage: 'failed',
				lastError: args.error ?? 'unknown_error',
				updatedAt: now,
			});
		}

		return null;
	},
});

export const processOneContentLabel = internalAction({
	args: v.object({ contentLabelId: v.id('contentLabels') }),
	returns: v.union(
		v.object({
			contentLabelId: v.id('contentLabels'),
			stage: v.literal('completed'),
		}),
		v.object({
			contentLabelId: v.id('contentLabels'),
			stage: v.literal('failed'),
		})
	),
	handler: async (ctx, args) => {
		// Use tryCatch for the initial query
		const { data: label, error: labelError } = await tryCatch(
			ctx.runQuery(
				internal.labelingEngine.contentLabelFunctions.getLabelBasics,
				{ contentLabelId: args.contentLabelId }
			)
		);

		if (labelError || !label) {
			throw new Error('contentLabel not found');
		}

		const source = label.contentKey.split(':')[0];
		if (!source) {
			throw new Error('source not found');
		}

		// Mark as processing in a separate transaction first
		const { error: markError } = await tryCatch(
			ctx.runMutation(
				internal.labelingEngine.contentLabelActions.markProcessing,
				{ contentLabelId: args.contentLabelId }
			)
		);

		if (markError) {
			throw new Error('Failed to mark as processing');
		}

		// Do the actual processing work
		let processingResult: {
			success: boolean;
			patch?: {
				contentUrl?: string;
				contentMediaType?: 'audio' | 'video' | 'text';
				title?: string;
				authorName?: string;
				authorUrl?: string;
				description?: string;
				thumbnailUrl?: string;
				fullDurationInMs?: number;
				contentLanguageCode?: 'en' | 'ja' | 'es' | 'fr' | 'de' | 'ko' | 'it' | 'zh' | 'hi' | 'ru' | 'ar' | 'pt' | 'tr';
				languageEvidence?: string[];
			};
			error?: string;
		};

		const { data: processData, error: processError } = await tryCatch(
			(async () => {
				switch (source) {
					case 'youtube':
						return await YouTubeProcessing.processYouTubeContentLabel(
							ctx,
							{ contentLabelId: args.contentLabelId }
						);
					case 'website':
						return await WebsiteProcessing.processWebsiteContentLabel(
							ctx,
							{ contentLabelId: args.contentLabelId }
						);
					default:
						throw new Error(`source [${source}] not supported`);
				}
			})()
		);

		if (processError) {
			processingResult = {
				success: false,
				error: processError.message ?? 'unknown_error',
			};
		} else {
			processingResult = processData;
		}

		// Use a single mutation to complete or fail the processing
		const { error: transactionError } = await tryCatch(
			ctx.runMutation(internal.labelingEngine.contentLabelActions.processContentLabelTransaction, {
				contentLabelId: args.contentLabelId,
				success: processingResult.success,
				patch: processingResult.patch,
				error: processingResult.error,
			})
		);

		if (transactionError) {
			throw new Error('Failed to complete processing transaction');
		}

		return {
			contentLabelId: args.contentLabelId,
			stage: processingResult.success ? 'completed' : 'failed',
		} as const;
	},
});
