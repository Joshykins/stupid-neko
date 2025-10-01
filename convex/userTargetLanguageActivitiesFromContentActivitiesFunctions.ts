import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { internalMutation } from './_generated/server';
import type { LanguageCode, MediaType } from './schema';
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

export const translateBatch = internalMutation({
	args: {
		limit: v.optional(v.number()),
	},
	returns: v.object({ processed: v.number(), createdActivities: v.number() }),
	handler: async (ctx, args) => {
		// Enforce strict limits for scalability
		const limit = Math.max(1, Math.min(100, args.limit ?? 50));

		// Pull a batch of content activities, oldest first to preserve ordering
		const candidates = await ctx.db
			.query('contentActivities')
			.order('asc')
			.take(limit);

		// All candidates are ready to translate (no filtering needed)
		const ready = candidates;
		if (ready.length === 0) {
			return { processed: 0, createdActivities: 0 } as const;
		}

		// Group by userId + contentKey
		const keyToEvents: Map<string, Array<Doc<'contentActivities'>>> = new Map();
		for (const row of ready) {
			const key = `${row.userId}:${row.contentKey}`;
			if (!keyToEvents.has(key)) keyToEvents.set(key, []);
			keyToEvents.get(key)!.push(row);
		}

		let processed = 0;
		let createdActivities = 0;

		for (const [, events] of keyToEvents) {
			// Sort by occurredAt (fallback to _creationTime)
			events.sort(
				(a, b) =>
					(a.occurredAt ?? a._creationTime) - (b.occurredAt ?? b._creationTime)
			);

			const sessions: Array<Session> = [];
			let current: Session | null = null;
			let lastTimeStamp: number | null = null;

			for (const event of events) {
				const timeStamp: number = event.occurredAt ?? event._creationTime;
				const type: ActivityType = event.activityType;

				if (!current) {
					if (type === 'start' || type === 'heartbeat') {
						current = {
							userId: event.userId,
							contentKey: event.contentKey,
							startMs: timeStamp,
							endMs: timeStamp,
							eventIds: [event._id],
						};
						lastTimeStamp = timeStamp;
					} else {
						// pause/end without start -> ignore and mark processed below
						lastTimeStamp = timeStamp;
					}
				} else {
					// We have an open session
					if (lastTimeStamp !== null && timeStamp - lastTimeStamp > GAP_MS) {
						// Gap split
						current.endMs = lastTimeStamp;
						sessions.push(current);
						current = null;
					}

					if (!current) {
						if (type === 'start' || type === 'heartbeat') {
							current = {
								userId: event.userId,
								contentKey: event.contentKey,
								startMs: timeStamp,
								endMs: timeStamp,
								eventIds: [event._id],
							};
							lastTimeStamp = timeStamp;
						} else {
							lastTimeStamp = timeStamp;
						}
						continue;
					}

					// Extend session
					if (type === 'heartbeat' || type === 'start') {
						current.endMs = timeStamp;
						current.eventIds.push(event._id);
						lastTimeStamp = timeStamp;
					} else if (type === 'pause' || type === 'end') {
						current.endMs = timeStamp;
						current.eventIds.push(event._id);
						sessions.push(current);
						current = null;
						lastTimeStamp = timeStamp;
					}
				}
			}

			// Handle trailing open session:
			// - If it's stale (no events for > GAP_MS), treat it as a closed session so it gets finalized
			// - Otherwise, maintain an in-progress languageActivity upsert
			if (current && lastTimeStamp !== null) {
				const nowMs = Date.now();
				const openEnd = lastTimeStamp;
				const durationMs = Math.max(0, openEnd - current.startMs);

				if (nowMs - openEnd > GAP_MS) {
					// Convert to a closed session; it will be finalized in the closed-session loop below
					sessions.push(current);
				} else {
					// Maintain in-progress
					// Load user and their current target language
					const user = await ctx.db.get(current.userId);
					if (user) {
						const userTargetLanguageId = user.currentTargetLanguageId as
							| Id<'userTargetLanguages'>
							| undefined;
						if (userTargetLanguageId) {
							const label = await ctx.db
								.query('contentLabels')
								.withIndex('by_content_key', q =>
									q.eq('contentKey', current.contentKey)
								)
								.unique();

							// If no label or not completed, mark waiting and skip creating in-progress
							if (
								!label ||
								label.stage !== 'completed' ||
								!label.contentLanguageCode
							) {
								for (const evId of current.eventIds) {
									await ctx.db.patch(evId, { isWaitingOnLabeling: true });
								}
							} else {
								// If label language doesn't match user's target language, delete contentActivities and skip
								const target = await ctx.db.get(userTargetLanguageId);
								if (
									!target ||
									target.languageCode !== label.contentLanguageCode
								) {
									for (const evId of current.eventIds) {
										await ctx.db.delete(evId);
										processed += 1;
									}
								} else {
									const devDate: number | undefined = user.devDate;
									const startMsEffective: number =
										dangerousTestingEnabled() && typeof devDate === 'number'
											? devDate
											: current.startMs;
									const title: string = label?.title ?? current.contentKey;
									const languageCode: LanguageCode | undefined =
										label?.contentLanguageCode;

									// Upsert in-progress record by (userId, state, contentKey)
									const existing = await ctx.db
										.query('userTargetLanguageActivities')
										.withIndex('by_user_state_and_content_key', q =>
											q
												.eq('userId', current.userId)
												.eq('state', 'in-progress')
												.eq('contentKey', current.contentKey)
										)
										.unique();

									if (existing) {
										await ctx.db.patch(existing._id, {
											durationInMs: Math.max(0, Math.round(durationMs)),
											languageCode,
											title,
											occurredAt: startMsEffective,
										});
									} else {
										await ctx.db.insert('userTargetLanguageActivities', {
											userId: current.userId,
											userTargetLanguageId,
											languageCode,
											contentKey: current.contentKey,
											state: 'in-progress',
											title,
											isManuallyTracked: false,
											durationInMs: Math.max(0, Math.round(durationMs)),
											occurredAt: startMsEffective,
										});
									}
									// Note: we do NOT mark events as translated yet for in-progress
								}
							}
						}
					}
				}
			}

			// Create language activities for closed sessions
			for (const s of sessions) {
				const durationMs = Math.max(0, s.endMs - s.startMs);

				// Load user and their current target language
				const user = await ctx.db.get(s.userId);
				if (!user) {
					// Delete immediately; user deleted edge case
					for (const evId of s.eventIds) {
						await ctx.db.delete(evId);
						processed += 1;
					}
					continue;
				}

				const userTargetLanguageId = user.currentTargetLanguageId as
					| Id<'userTargetLanguages'>
					| undefined;
				if (!userTargetLanguageId) {
					// Delete immediately; skip creating activity
					for (const evId of s.eventIds) {
						await ctx.db.delete(evId);
						processed += 1;
					}
					continue;
				}

				// Fetch label for metadata
				const label = await ctx.db
					.query('contentLabels')
					.withIndex('by_content_key', q => q.eq('contentKey', s.contentKey))
					.unique();

				// If no label or not completed, we cannot determine language yet
				if (
					!label ||
					label.stage !== 'completed' ||
					!label.contentLanguageCode
				) {
					// Delete activities immediately to avoid infinite loop
					// These activities cannot be processed due to missing language information
					for (const evId of s.eventIds) {
						await ctx.db.delete(evId);
						processed += 1;
					}
					continue;
				}

				// If label language doesn't match user's target language, delete contentActivities and skip
				const target = await ctx.db.get(userTargetLanguageId);
				if (!target || target.languageCode !== label.contentLanguageCode) {
					for (const evId of s.eventIds) {
						await ctx.db.delete(evId);
						processed += 1;
					}
					continue;
				}

				const title: string = label?.title ?? s.contentKey;
				const languageCode: LanguageCode | undefined =
					label?.contentLanguageCode;
				const contentMediaType: MediaType | undefined = label?.contentMediaType;

				const durationInMinutes = Math.max(1, Math.round(durationMs / 60000));
				const devDate: number | undefined = user.devDate;
				const startMsEffective: number =
					dangerousTestingEnabled() && typeof devDate === 'number'
						? devDate
						: s.startMs;

				try {
					// If an in-progress exists for this contentKey, patch to completed; else insert completed
					const existing = await ctx.db
						.query('userTargetLanguageActivities')
						.withIndex('by_user_state_and_content_key', q =>
							q
								.eq('userId', s.userId)
								.eq('state', 'in-progress')
								.eq('contentKey', s.contentKey)
						)
						.unique();

					if (existing) {
						await ctx.db.patch(existing._id, {
							state: 'completed',
							durationInMs: Math.max(0, Math.round(s.endMs - s.startMs)),
							languageCode,
							title,
							occurredAt: startMsEffective,
						});
						// Ensure daily streak is credited for this finalized session
						const occurredAtForStreak: number = startMsEffective;
						await updateStreakOnActivity({
							ctx,
							args: {
								userId: s.userId,
								occurredAt: occurredAtForStreak,
							}
						});
						
						// Award XP for finalized activity
						await addExperience({
							ctx,
							args: {
								userId: s.userId,
								languageCode,
								languageActivityId: existing._id,
								isApplyingStreakBonus: true,
								durationInMinutes,
								deltaExperience: await getExperienceForActivity({
									ctx,
									args: {
										userId: s.userId,
										languageCode,
										isManuallyTracked: false,
										durationInMinutes,
									}
								}),
							},
						});
					} else {
						await addLanguageActivity({
							ctx,
							args: {
								userId: s.userId,
								userTargetLanguageId,
								title,
								description: undefined,
								durationInMinutes,
								occurredAt: startMsEffective,
								contentKey: s.contentKey,
								languageCode,
								contentCategories: contentMediaType
									? [contentMediaType]
									: undefined,
								isManuallyTracked: false,
							},
						});
						createdActivities += 1;
					}
				} finally {
					// Delete consumed events after creating/completing their languageActivity
					for (const eventId of s.eventIds) {
						await ctx.db.delete(eventId);
						processed += 1;
					}
				}
			}

			// Delete orphaned events immediately (events that don't form complete sessions)
			const processedEventIds = new Set<string>();
			
			// Collect all event IDs that were processed in sessions
			for (const session of sessions) {
				for (const eventId of session.eventIds) {
					processedEventIds.add(eventId);
				}
			}
			
			// Delete remaining events immediately
			for (const event of events) {
				if (!processedEventIds.has(event._id)) {
					await ctx.db.delete(event._id);
					processed += 1;
				}
			}
		}

		return { processed, createdActivities } as const;
	},
});

