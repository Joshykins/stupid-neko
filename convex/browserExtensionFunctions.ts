import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Id, Doc } from './_generated/dataModel';
import {
	mutation,
	query,
	type QueryCtx,
	type MutationCtx,
} from './_generated/server';
import { contentSourceValidator, languageCodeValidator } from './schema';
import {
	getUserByIntegrationKey,
	markIntegrationKeyAsUsed,
} from './integrationKeyFunctions';
import { recordContentActivity } from './labelingEngine/contentActivityFunctions';
import { getContentLabelByContentKey } from './labelingEngine/contentLabelFunctions';
import { getCurrentTargetLanguage } from './userFunctions';

export const meFromIntegration = query({
	args: { integrationId: v.string() },
	returns: v.union(
		v.object({
			name: v.optional(v.string()),
			email: v.optional(v.string()),
			image: v.optional(v.string()),
			timezone: v.optional(v.string()),
			languageCode: v.optional(v.string()),
		}),
		v.null()
	),
	handler: async (ctx, args) => {
		const user = await getUserByIntegrationKey({
			ctx,
			args: { integrationId: args.integrationId },
		});
		if (!user) return null;
		const currentTargetLanguageId = user.currentTargetLanguageId;
		if (!currentTargetLanguageId)
			throw new Error('Current target language not found');
		const tl = await ctx.db.get(currentTargetLanguageId);
		return {
			name: user.name ?? undefined,
			email: user.email ?? undefined,
			image: user.image ?? undefined,
			timezone: user.timezone ?? undefined,
			languageCode: tl?.languageCode ?? undefined,
		};
	},
});

export const markIntegrationKeyAsUsedFromExtension = mutation({
	args: { integrationId: v.string() },
	handler: async (ctx, args): Promise<null> => {
		await markIntegrationKeyAsUsed({
			ctx,
			args: { integrationId: args.integrationId },
		});

		return null;
	},
});

export const recordContentActivityFromIntegration = mutation({
	args: {
		integrationId: v.string(),
		source: contentSourceValidator,
		activityType: v.union(
			v.literal('heartbeat'),
			v.literal('start'),
			v.literal('pause'),
			v.literal('end')
		),
		contentKey: v.string(),
		url: v.optional(v.string()),
		occurredAt: v.optional(v.number()),
	},
	returns: v.object({
		ok: v.boolean(),
		saved: v.boolean(),
		contentActivityId: v.optional(v.id('contentActivities')),
		contentLabelId: v.optional(v.id('contentLabels')),
		isWaitingOnLabeling: v.optional(v.boolean()),
		reason: v.optional(v.string()),
		contentKey: v.optional(v.string()),
		contentLabel: v.optional(v.any()),
		currentTargetLanguage: v.optional(
			v.union(
				v.object({ languageCode: v.optional(languageCodeValidator) }),
				v.null()
			)
		),
	}),
	handler: async (
		ctx,
		args
	): Promise<{
		ok: boolean;
		saved: boolean;
		contentActivityId?: Id<'contentActivities'>;
		contentLabelId?: Id<'contentLabels'>;
		isWaitingOnLabeling?: boolean;
		reason?: string;
		contentKey?: string;
		contentLabel?: unknown;
		currentTargetLanguage?: {
			languageCode?: import('./schema').LanguageCode;
		} | null;
	}> => {
		const { integrationId, ...rest } = args;
		const user = await getUserByIntegrationKey({
			ctx,
			args: { integrationId: args.integrationId },
		});
		const userId = user._id;
		const result = await recordContentActivity({
			ctx,
			args: { userId, ...rest },
		});
		let contentLabel = null;

		if (result?.contentKey) {
			contentLabel = await getContentLabelByContentKey({
				ctx,
				args: { contentKey: result.contentKey },
			});
		}

		let currentTargetLanguage = null;
		currentTargetLanguage = await getCurrentTargetLanguage({
			ctx,
			args: { userId },
		});
		return { ...result, contentLabel, currentTargetLanguage };
	},
});


