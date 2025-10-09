import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { internalMutation, internalQuery } from './_generated/server';
import type { LanguageCode } from './schema';
import { dangerousTestingEnabled } from './utils';
import { addLanguageActivity } from './userTargetLanguageActivityFunctions';
import { addExperience, getExperienceForActivity } from './userTargetLanguageExperienceFunctions';
import { updateStreakOnActivity } from './userStreakFunctions';

type ActivityType = 'heartbeat' | 'start' | 'pause' | 'end';

type Session = {
	userId: Id<'users'>;
	contentKey: string;
	startMs: number;
	endMs: number;
	eventIds: Array<Id<'contentActivities'>>;
};

const GAP_MS = 2 * 60 * 1000; // 2 minutes gap splits sessions



// Find users with pending content activities (oldest-first scan, dedup)
export const findUsersWithPendingContentActivities = internalQuery({
	args: {
		maxScan: v.optional(v.number()), // deprecated, ignored
		maxUsers: v.optional(v.number()),
	},
	returns: v.array(v.id('users')),
	handler: async (ctx, args) => {
		const maxUsers = Math.max(1, Math.min(200, args.maxUsers ?? 50));
		const users = await ctx.db
			.query('users')
			.withIndex('by_has_pending', q => q.eq('hasPendingContentActivities', true))
			.take(maxUsers);
		return users.map(u => u._id);
	},
});

// Process activities for a single user in a micro-batch
export const processActivitiesForUser = internalMutation({
	args: {
		userId: v.id('users'),
		limit: v.optional(v.number()),
	},
	returns: v.object({ processed: v.number(), createdActivities: v.number() }),
	handler: async (ctx, args) => {
		const limit = Math.max(1, Math.min(500, args.limit ?? 200));
		const events = await ctx.db
			.query('contentActivities')
			.withIndex('by_user_and_occurred', q => q.eq('userId', args.userId))
			.order('asc')
			.take(limit);
		if (events.length === 0) return { processed: 0, createdActivities: 0 } as const;

		// Group by contentKey for sessionization
		const byKey = new Map<string, Array<Doc<'contentActivities'>>>();
		for (const ev of events) {
			if (!byKey.has(ev.contentKey)) byKey.set(ev.contentKey, []);
			byKey.get(ev.contentKey)!.push(ev);
		}

		let processed = 0;
		let createdActivities = 0;

		for (const [contentKey, evs] of byKey) {
			// Sort events by time
			evs.sort((a, b) => (a.occurredAt ?? a._creationTime) - (b.occurredAt ?? b._creationTime));

			// Build sessions
			const sessions: Array<Session> = [];
			let current: Session | null = null;
			let lastTime: number | null = null;
			for (const e of evs) {
				const t = e.occurredAt ?? e._creationTime;
				const type: ActivityType = e.activityType;
				if (!current) {
					if (type === 'start' || type === 'heartbeat') {
						current = { userId: e.userId, contentKey, startMs: t, endMs: t, eventIds: [e._id] };
						lastTime = t;
					} else {
						lastTime = t;
					}
				} else {
					if (lastTime !== null && t - lastTime > GAP_MS) {
						current.endMs = lastTime;
						sessions.push(current);
						current = null;
					}
					if (!current) {
						if (type === 'start' || type === 'heartbeat') {
							current = { userId: e.userId, contentKey, startMs: t, endMs: t, eventIds: [e._id] };
							lastTime = t;
						} else {
							lastTime = t;
						}
						continue;
					}
					if (type === 'heartbeat' || type === 'start') {
						current.endMs = t;
						current.eventIds.push(e._id);
						lastTime = t;
					} else if (type === 'pause' || type === 'end') {
						current.endMs = t;
						current.eventIds.push(e._id);
						sessions.push(current);
						current = null;
						lastTime = t;
					}
				}
			}

			// Handle trailing open session
			if (current && lastTime !== null) {
				const nowMs = Date.now();
				if (nowMs - lastTime > GAP_MS) {
					sessions.push(current);
				} else {
					// Maintain in-progress record for this (userId, contentKey)
					const user = await ctx.db.get(args.userId);
					if (user?.currentTargetLanguageId) {
						const label = await ctx.db
							.query('contentLabels')
							.withIndex('by_content_key', q => q.eq('contentKey', contentKey))
							.unique();
						const isWebsite = contentKey.startsWith('website:');
						if (!isWebsite) {
							if (!label || label.stage !== 'completed' || !label.contentLanguageCode) {
								for (const id of current.eventIds) await ctx.db.patch(id, { isWaitingOnLabeling: true });
							} else {
								const target = await ctx.db.get(user.currentTargetLanguageId);
								if (!target || target.languageCode !== label.contentLanguageCode) {
									for (const id of current.eventIds) { await ctx.db.delete(id); processed += 1; }
								} else {
									const devDate: number | undefined = user.devDate;
									const startMs = (dangerousTestingEnabled() && typeof devDate === 'number') ? devDate : current.startMs;
									const title = label?.title ?? contentKey;
									const languageCode: LanguageCode | undefined = label?.contentLanguageCode;
									const durationMs = Math.max(0, lastTime - current.startMs);
									const existing = await ctx.db
										.query('userTargetLanguageActivities')
										.withIndex('by_user_state_and_content_key', q => q.eq('userId', args.userId).eq('state', 'in-progress').eq('contentKey', contentKey))
										.unique();
									if (existing) {
										await ctx.db.patch(existing._id, { durationInMs: Math.max(0, Math.round(durationMs)), languageCode, title, occurredAt: startMs });
									} else {
										await ctx.db.insert('userTargetLanguageActivities', { userId: args.userId, userTargetLanguageId: user.currentTargetLanguageId, languageCode, contentKey, state: 'in-progress', title, isManuallyTracked: false, durationInMs: Math.max(0, Math.round(durationMs)), occurredAt: startMs });
									}
								}
							}
						} else {
							const target = await ctx.db.get(user.currentTargetLanguageId);
							const devDate: number | undefined = user.devDate;
							const startMs = (dangerousTestingEnabled() && typeof devDate === 'number') ? devDate : current.startMs;
							const title = label?.title ?? contentKey;
							const languageCode: LanguageCode | undefined = target?.languageCode as LanguageCode | undefined;
							const durationMs = Math.max(0, lastTime - current.startMs);
							const existing = await ctx.db
								.query('userTargetLanguageActivities')
								.withIndex('by_user_state_and_content_key', q => q.eq('userId', args.userId).eq('state', 'in-progress').eq('contentKey', contentKey))
								.unique();
							if (existing) {
								await ctx.db.patch(existing._id, { durationInMs: Math.max(0, Math.round(durationMs)), languageCode, title, occurredAt: startMs });
							} else {
								await ctx.db.insert('userTargetLanguageActivities', { userId: args.userId, userTargetLanguageId: user.currentTargetLanguageId, languageCode, contentKey, state: 'in-progress', title, isManuallyTracked: false, durationInMs: Math.max(0, Math.round(durationMs)), occurredAt: startMs });
							}
						}
					}
				}
			}

			// Finalize closed sessions
			for (const s of sessions) {
				const durationMs = Math.max(0, s.endMs - s.startMs);
				const user = await ctx.db.get(args.userId);
				if (!user?.currentTargetLanguageId) {
					for (const id of s.eventIds) { await ctx.db.delete(id); processed += 1; }
					continue;
				}
				const label = await ctx.db.query('contentLabels').withIndex('by_content_key', q => q.eq('contentKey', s.contentKey)).unique();
				const isWebsite = s.contentKey.startsWith('website:');
				if (!isWebsite) {
					if (!label || label.stage !== 'completed' || !label.contentLanguageCode) {
						for (const id of s.eventIds) { await ctx.db.delete(id); processed += 1; }
						continue;
					}
					const target = await ctx.db.get(user.currentTargetLanguageId);
					if (!target || target.languageCode !== label.contentLanguageCode) {
						for (const id of s.eventIds) { await ctx.db.delete(id); processed += 1; }
						continue;
					}
				}
				const target = await ctx.db.get(user.currentTargetLanguageId);
				const title: string = label?.title ?? s.contentKey;
				const languageCode: LanguageCode | undefined = isWebsite ? (target?.languageCode as LanguageCode | undefined) : label?.contentLanguageCode;
				if (!languageCode) { for (const id of s.eventIds) { await ctx.db.delete(id); processed += 1; } continue; }
				const devDate: number | undefined = (user as any).devDate;
				const startMsEffective = (dangerousTestingEnabled() && typeof devDate === 'number') ? devDate : s.startMs;
				const existing = await ctx.db
					.query('userTargetLanguageActivities')
					.withIndex('by_user_state_and_content_key', q => q.eq('userId', args.userId).eq('state', 'in-progress').eq('contentKey', s.contentKey))
					.unique();
				if (existing) {
					// Update existing in-progress activity to completed
					await ctx.db.patch(existing._id, {
						state: 'completed',
						durationInMs: Math.max(0, Math.round(s.endMs - s.startMs)),
						languageCode,
						title,
						occurredAt: startMsEffective
					});
					await updateStreakOnActivity({ ctx, args: { userId: args.userId, occurredAt: startMsEffective } });
					await addExperience({
						ctx,
						args: {
							userId: args.userId,
							languageCode,
							languageActivityId: existing._id,
							isApplyingStreakBonus: true,
							durationInMs: durationMs,
							deltaExperience: await getExperienceForActivity({
								ctx,
								args: {
									userId: args.userId,
									languageCode,
									isManuallyTracked: false,
									durationInMs: durationMs
								}
							})
						}
					});
				} else {
					// Create new completed activity if no existing in-progress activity
					await addLanguageActivity({
						ctx,
						args: {
							userId: args.userId,
							userTargetLanguageId: user.currentTargetLanguageId,
							title,
							description: undefined,
							durationInMs: durationMs,
							occurredAt: startMsEffective,
							contentKey: s.contentKey,
							languageCode,
							contentCategories: label?.contentMediaType ? [label.contentMediaType] : undefined,
							isManuallyTracked: false
						}
					});
					createdActivities += 1;
				}
				for (const id of s.eventIds) { await ctx.db.delete(id); processed += 1; }
			}
		}


		// If no remaining events for this user, clear the pending flag
		const remaining = await ctx.db
			.query('contentActivities')
			.withIndex('by_user', q => q.eq('userId', args.userId))
			.take(1);
		if (remaining.length === 0) {
			await ctx.db.patch(args.userId, { hasPendingContentActivities: false });
		}
		return { processed, createdActivities } as const;
	},
});
