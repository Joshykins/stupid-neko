// Content Activities are the heartbeats, starts, pauses, ends, etc of any automated injestion of content

import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { getEffectiveNow } from '../utils';
import { getOrCreateContentLabel } from './contentLabelFunctions';

export const recordContentActivity = async ({
	ctx,
	args,
}: {
	ctx: MutationCtx;
	args: {
		userId: Id<'users'>;
		source: 'youtube' | 'spotify' | 'anki' | 'manual' | 'website';
		activityType: 'heartbeat' | 'start' | 'pause' | 'end';
		contentKey: string;
		url?: string;
		occurredAt?: number;
	};
}): Promise<{
	ok: true;
	saved: boolean;
	contentActivityId?: Id<'contentActivities'>;
	contentLabelId?: Id<'contentLabels'>;
	isWaitingOnLabeling?: boolean;
	reason?: string;
	contentKey?: string;
}> => {
	const userId = args.userId;

	// Load user and their current target language as required by the app
	const user = await ctx.db.get(userId);
	if (!user) throw new Error('User not found');
	const currentTargetLanguageId = user.currentTargetLanguageId as
		| Id<'userTargetLanguages'>
		| undefined;
	if (!currentTargetLanguageId)
		throw new Error('Current target language not found');

	const contentKey = args.contentKey;

	const occurredAt = await getEffectiveNow(ctx);

	// Short-circuit if user has a blocking policy for this content
	const existingBlockingPolicy = await ctx.db
		.query('userContentLabelPolicies')
		.withIndex('by_user_and_content_key', q =>
			q.eq('userId', userId).eq('contentKey', contentKey)
		)
		.unique();
	if (existingBlockingPolicy && existingBlockingPolicy.policyKind === 'block') {
		return {
			ok: true,
			saved: false,
			reason: 'blocked_by_policy',
			contentKey,
		};
	}

	// Inspect existing content label
	const label = await ctx.db
		.query('contentLabels')
		.withIndex('by_content_key', q => q.eq('contentKey', contentKey))
		.unique();

	// If no label exists, enqueue and record the activity as waiting on labeling
	if (!label) {
		const contentActivityId = await ctx.db.insert('contentActivities', {
			userId,
			contentKey,
			activityType: args.activityType,
			occurredAt,
			isWaitingOnLabeling: true,
		});
		const enqueue = await getOrCreateContentLabel({
			ctx,
			args: {
				contentKey,
				contentSource: args.source as
					| 'youtube'
					| 'spotify'
					| 'anki'
					| 'manual'
					| 'website',
				contentUrl: args.url,
			}
		});
		// Mark user as having pending content activities
		await ctx.db.patch(userId, { hasPendingContentActivities: true });
		return {
			ok: true,
			saved: true,
			contentActivityId,
			contentLabelId: enqueue.contentLabelId,
			isWaitingOnLabeling: true,
			contentKey,
		};
	}

	// If label exists but isn't completed or lacks language, record as waiting
	if (label.stage !== 'completed' || !label.contentLanguageCode) {
		const contentActivityId = await ctx.db.insert('contentActivities', {
			userId,
			contentKey,
			activityType: args.activityType,
			occurredAt,
			isWaitingOnLabeling: true,
		});
		// Mark user as having pending content activities
		await ctx.db.patch(userId, { hasPendingContentActivities: true });
		return {
			ok: true,
			saved: true,
			contentActivityId,
			contentLabelId: label._id,
			isWaitingOnLabeling: true,
			contentKey,
		};
	}

	// Otherwise, filter by user's target language
	const currentTargetLanguage = await ctx.db.get(currentTargetLanguageId);
	if (!currentTargetLanguage)
		throw new Error('Current target language not found');
	if (currentTargetLanguage.languageCode !== label.contentLanguageCode) {
		return {
			ok: true,
			saved: false,
			reason: 'not_target_language',
			contentLabelId: label._id,
			contentKey,
		};
	}

	// Label matches target language, record activity normally
	const contentActivityId = await ctx.db.insert('contentActivities', {
		userId,
		contentKey,
		activityType: args.activityType,
		occurredAt,
		isWaitingOnLabeling: false,
	});

	// Mark user as having pending content activities
	await ctx.db.patch(userId, { hasPendingContentActivities: true });
	return {
		ok: true,
		saved: true,
		contentActivityId,
		contentLabelId: label._id,
		isWaitingOnLabeling: false,
		contentKey,
	};
};
