import { v } from 'convex/values';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { internalMutation, internalQuery } from '../_generated/server';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import {
	contentSourceValidator,
	languageCodeValidator,
	mediaTypeValidator,
} from '../schema';
import dayjs from '../../lib/dayjs';

export const getContentLabelByContentKey = async ({
	ctx,
	args,
}: {
	ctx: QueryCtx;
	args: { contentKey: string };
}): Promise<{
	_id: Id<'contentLabels'>;
	contentKey: string;
	stage: 'queued' | 'processing' | 'completed' | 'failed';
	contentSource:
		| 'youtube'
		| 'spotify'
		| 'anki'
		| 'manual'
		| 'website';
	contentUrl?: string;
	contentMediaType?: 'audio' | 'video' | 'text';
	title?: string;
	authorName?: string;
	authorUrl?: string;
	description?: string;
	thumbnailUrl?: string;
	fullDurationInMs?: number;
	contentLanguageCode?: string;
	languageEvidence?: string[];
} | null> => {
	const label = await ctx.db
		.query('contentLabels')
		.withIndex('by_content_key', q => q.eq('contentKey', args.contentKey))
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
		fullDurationInMs: label.fullDurationInMs,
		contentLanguageCode: label.contentLanguageCode,
		languageEvidence: label.languageEvidence,
	};
};

// Base: create or return contentLabel by key and source
export const getOrCreateContentLabel = async ({
	ctx,
	args,
}: {
	ctx: MutationCtx;
	args: {
		contentKey: string; // e.g. "youtube:VIDEO_ID"
		contentSource: 'youtube' | 'spotify' | 'anki' | 'manual' | 'website';
		contentUrl?: string;
	};
}): Promise<{
	contentLabelId: Id<'contentLabels'>;
	contentKey: string;
	stage: 'queued' | 'processing' | 'completed' | 'failed';
	existed: boolean;
}> => {
	const existing = await ctx.db
		.query('contentLabels')
		.withIndex('by_content_key', q => q.eq('contentKey', args.contentKey))
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
			stage: existing.stage,
			existed: true,
		};
	}
	const now = dayjs().valueOf();
	const contentLabelId = await ctx.db.insert('contentLabels', {
		contentKey: args.contentKey,
		stage: 'queued',
		contentSource: args.contentSource,
		contentUrl: args.contentUrl,
		attempts: 0,
		createdAt: now,
		updatedAt: now,
	});
	// Automatically process newly added content labels
	await ctx.scheduler.runAfter(
		0,
		internal.labelingEngine.contentLabelActions.processOneContentLabel,
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
		stage: 'queued',
		existed: false,
	};
};



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
			contentKey: doc.contentKey,
			contentUrl: doc.contentUrl,
		};
	},
});

export const getLabelWithMetadata = internalQuery({
	args: v.object({ contentLabelId: v.id('contentLabels') }),
	returns: v.object({
		_id: v.id('contentLabels'),
		contentKey: v.optional(v.string()),
		contentUrl: v.optional(v.string()),
		title: v.optional(v.string()),
		authorName: v.optional(v.string()),
		thumbnailUrl: v.optional(v.string()),
		fullDurationInMs: v.optional(v.number()),
		description: v.optional(v.string()),
	}),
	handler: async (ctx, args) => {
		const doc = await ctx.db.get(args.contentLabelId);
		if (!doc) throw new Error('contentLabel not found');
		return {
			_id: doc._id,
			contentKey: doc.contentKey,
			contentUrl: doc.contentUrl,
			title: doc.title,
			authorName: doc.authorName,
			thumbnailUrl: doc.thumbnailUrl,
			fullDurationInMs: doc.fullDurationInMs,
			description: doc.description,
		};
	},
});
