// Content Activities are the heartbeats, starts, pauses, ends, etc of any automated injestion of content

import type { Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { getEffectiveNow } from '../utils';
import { getOrCreateContentLabel } from './contentLabelFunctions';
import { createOrUpdateLanguageActivityFromContent } from '../userTargetLanguageActivityFunctions';

// Helper function to convert content source to activity source
function getSourceFromContentSource(contentSource: 'youtube' | 'spotify' | 'anki' | 'manual' | 'website'): 'browser-extension-youtube-provider' | 'browser-extension-website-provider' | 'spotify' {
	switch (contentSource) {
		case 'youtube':
			return 'browser-extension-youtube-provider';
		case 'website':
			return 'browser-extension-website-provider';
		case 'spotify':
			return 'spotify';
		case 'anki':
		case 'manual':
		default:
			// All other sources fallback to website provider
			return 'browser-extension-website-provider';
	}
}

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
	languageActivityId?: Id<'userTargetLanguageActivities'>;
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

	// Prefer client-provided timestamp to avoid bunching events at server time
	// Clamp slight future skew to protect against clock drift
	const nowEffective = await getEffectiveNow(ctx);
	const incoming = args.occurredAt;
	const occurredAt =
		typeof incoming === 'number' && incoming > 0
			? Math.min(incoming, nowEffective + 5 * 60 * 1000)
			: nowEffective;

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

	// Get user's target language
	const currentTargetLanguage = await ctx.db.get(currentTargetLanguageId);
	if (!currentTargetLanguage)
		throw new Error('Current target language not found');

	// Inspect existing content label
	const label = await ctx.db
		.query('contentLabels')
		.withIndex('by_content_key', q => q.eq('contentKey', contentKey))
		.unique();

	// If no label exists, enqueue labeling and create activity with user's target language
	if (!label) {
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

		// Create activity with user's target language (will be updated when labeling completes)
		const result = await createOrUpdateLanguageActivityFromContent({
			ctx,
			args: {
				userId,
				contentKey,
				occurredAt,
				userTargetLanguageId: currentTargetLanguageId,
				userTargetLanguageCode: currentTargetLanguage.languageCode as any,
				source: getSourceFromContentSource(args.source),
			}
		});

		return {
			ok: true,
			saved: result.activityId !== undefined,
			languageActivityId: result.activityId,
			contentLabelId: enqueue.contentLabelId,
			isWaitingOnLabeling: true,
			contentKey,
		};
	}

	// If label exists but isn't completed or lacks language, create activity with user's target language
	if (label.stage !== 'completed' || !label.contentLanguageCode) {
		const result = await createOrUpdateLanguageActivityFromContent({
			ctx,
			args: {
				userId,
				contentKey,
				occurredAt,
				userTargetLanguageId: currentTargetLanguageId,
				userTargetLanguageCode: currentTargetLanguage.languageCode as any,
				source: getSourceFromContentSource(args.source),
			}
		});

		return {
			ok: true,
			saved: result.activityId !== undefined,
			languageActivityId: result.activityId,
			contentLabelId: label._id,
			isWaitingOnLabeling: true,
			contentKey,
		};
	}

	// Label exists and is completed, create activity with detected language
	const result = await createOrUpdateLanguageActivityFromContent({
		ctx,
		args: {
			userId,
			contentKey,
			occurredAt,
			contentLabel: {
				title: label.title,
				contentLanguageCode: label.contentLanguageCode as any,
				contentMediaType: label.contentMediaType,
				isAboutTargetLanguages: label.isAboutTargetLanguages as any,
			},
			userTargetLanguageId: currentTargetLanguageId,
			userTargetLanguageCode: currentTargetLanguage.languageCode as any,
			source: getSourceFromContentSource(args.source),
		}
	});

	// Check if activity was skipped due to language mismatch
	if (!result.activityId && !result.wasUpdated && !result.wasCompleted) {
		return {
			ok: true,
			saved: false,
			reason: 'not_target_language',
			contentLabelId: label._id,
			contentKey,
		};
	}

	return {
		ok: true,
		saved: result.activityId !== undefined,
		languageActivityId: result.activityId,
		contentLabelId: label._id,
		isWaitingOnLabeling: false,
		contentKey,
	};
};
