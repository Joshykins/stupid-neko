import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

type ActivityType = "heartbeat" | "start" | "pause" | "end";

type Session = {
    userId: Id<"users">;
    contentKey: string;
    startMs: number;
    endMs: number;
    eventIds: Array<Id<"contentActivities">>;
};

const GAP_MS = 2 * 60 * 1000; // 2 minutes gap splits sessions
const MIN_SESSION_MS = 60 * 1000; // minimum 1 minute to count

export const translateBatch = internalMutation({
    args: {
        limit: v.optional(v.number()),
    },
    returns: v.object({ processed: v.number(), createdActivities: v.number() }),
    handler: async (ctx, args) => {
        const limit = Math.max(1, Math.min(2000, args.limit ?? 500));

        // Pull a batch of content activities, oldest first to preserve ordering
        const candidates = await ctx.db
            .query("contentActivities")
            .order("asc")
            .take(limit);

        // Filter to those ready to translate
        const ready = candidates.filter((row: any) => !row.translated);
        if (ready.length === 0) {
            return { processed: 0, createdActivities: 0 } as const;
        }

        // Group by userId + contentKey
        const keyToEvents: Map<string, Array<any>> = new Map();
        for (const row of ready) {
            const key = `${row.userId}:${row.contentKey}`;
            if (!keyToEvents.has(key)) keyToEvents.set(key, []);
            keyToEvents.get(key)!.push(row);
        }

        let processed = 0;
        let createdActivities = 0;

        for (const [, events] of keyToEvents) {
            // Sort by occurredAt (fallback to _creationTime)
            events.sort((a, b) => ((a.occurredAt ?? a._creationTime) - (b.occurredAt ?? b._creationTime)));

            const sessions: Array<Session> = [];
            let current: Session | null = null;
            let lastTimeStamp: number | null = null;

            for (const event of events) {
                const timeStamp: number = (event.occurredAt ?? event._creationTime) as number;
                const type: ActivityType = event.activityType as ActivityType;

                if (!current) {
                    if (type === "start" || type === "heartbeat") {
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
                        if (type === "start" || type === "heartbeat") {
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
                    if (type === "heartbeat" || type === "start") {
                        current.endMs = timeStamp;
                        current.eventIds.push(event._id);
                        lastTimeStamp = timeStamp;
                    } else if (type === "pause" || type === "end") {
                        current.endMs = timeStamp;
                        current.eventIds.push(event._id);
                        sessions.push(current);
                        current = null;
                        lastTimeStamp = timeStamp;
                    }
                }
            }

            // Handle trailing open session: maintain an in-progress languageActivity upsert
            if (current && lastTimeStamp !== null) {
                const nowMs = Date.now();
                const openEnd = lastTimeStamp;
                const durationMs = Math.max(0, openEnd - current.startMs);

                // Load user and their current target language
                const user = await ctx.db.get(current.userId);
                if (user) {
                    const userTargetLanguageId = (user.currentTargetLanguageId as Id<"userTargetLanguages"> | undefined);
                    if (userTargetLanguageId) {
                        const label = await ctx.db
                            .query("contentLabel")
                            .withIndex("by_content_key", (q: any) => q.eq("contentKey", current.contentKey))
                            .unique();

                        // If no label or not completed, mark waiting and skip creating in-progress
                        if (!label || label.stage !== "completed" || !label.contentLanguageCode) {
                            for (const evId of current.eventIds) {
                                await ctx.db.patch(evId, { isWaitingOnLabeling: true });
                            }
                        } else {
                            // If label language doesn't match user's target language, delete contentActivities and skip
                            const target = await ctx.db.get(userTargetLanguageId);
                            if (!target || target.languageCode !== label.contentLanguageCode) {
                                for (const evId of current.eventIds) {
                                    await ctx.db.delete(evId);
                                    processed += 1;
                                }
                            } else {
                                if (durationMs >= MIN_SESSION_MS) {
                                    const title: string = (label?.title as string | undefined) ?? current.contentKey;
                                    const languageCode = label?.contentLanguageCode as any;
                                    const source = label?.contentSource as any;
                                    const contentMediaType = label?.contentMediaType as ("audio" | "video" | "text" | undefined);
                                    const contentCategories = contentMediaType ? [contentMediaType] as Array<"audio" | "video" | "text" | "other"> : undefined;

                                    // Upsert in-progress record by (userId, state, contentKey)
                                    const existing = await ctx.db
                                        .query("languageActivities")
                                        .withIndex("by_user_state_and_content_key", (q: any) =>
                                            q.eq("userId", current.userId).eq("state", "in-progress").eq("contentKey", current.contentKey),
                                        )
                                        .unique();

                                    if (existing) {
                                        await ctx.db.patch(existing._id, {
                                            durationInSeconds: Math.max(0, Math.round(durationMs / 1000)),
                                            languageCode,
                                            title,
                                            occurredAt: current.startMs,
                                        });
                                    } else {
                                        await ctx.db.insert("languageActivities", {
                                            userId: current.userId,
                                            userTargetLanguageId,
                                            languageCode,
                                            contentKey: current.contentKey,
                                            state: "in-progress",
                                            title,
                                            isManuallyTracked: false,
                                            durationInSeconds: Math.max(0, Math.round(durationMs / 1000)),
                                            occurredAt: current.startMs,
                                        });
                                    }
                                }
                                // Note: we do NOT mark events as translated yet for in-progress
                            }
                        }
                    }
                }
            }

            // Create language activities for closed sessions
            for (const s of sessions) {
                const durationMs = Math.max(0, s.endMs - s.startMs);
                if (durationMs < MIN_SESSION_MS) {
                    // Mark the underlying events as translated but skip creating an activity
                    for (const evId of s.eventIds) {
                        await ctx.db.patch(evId, { translated: true, processedAt: Date.now() });
                        processed += 1;
                    }
                    continue;
                }

                // Load user and their current target language
                const user = await ctx.db.get(s.userId);
                if (!user) {
                    // Mark processed to avoid blocking; user deleted edge case
                    for (const evId of s.eventIds) {
                        await ctx.db.patch(evId, { translated: true, processedAt: Date.now() });
                        processed += 1;
                    }
                    continue;
                }

                const userTargetLanguageId = (user.currentTargetLanguageId as Id<"userTargetLanguages"> | undefined);
                if (!userTargetLanguageId) {
                    // Mark processed to avoid hot loop; skip creating activity
                    for (const evId of s.eventIds) {
                        await ctx.db.patch(evId, { translated: true, processedAt: Date.now() });
                        processed += 1;
                    }
                    continue;
                }

                // Fetch label for metadata
                const label = await ctx.db
                    .query("contentLabel")
                    .withIndex("by_content_key", (q: any) => q.eq("contentKey", s.contentKey))
                    .unique();

                // If no label or not completed, we cannot determine language yet
                if (!label || label.stage !== "completed" || !label.contentLanguageCode) {
                    // Still waiting on labeling; skip for now (leave events as-is)
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

                const title: string = (label?.title as string | undefined) ?? s.contentKey;
                const languageCode = label?.contentLanguageCode as any;
                const source = label?.contentSource as any;
                const contentMediaType = label?.contentMediaType as ("audio" | "video" | "text" | undefined);

                const durationInMinutes = Math.max(1, Math.round(durationMs / 60000));

                try {
                    // If an in-progress exists for this contentKey, patch to completed; else insert completed
                    const existing = await ctx.db
                        .query("languageActivities")
                        .withIndex("by_user_state_and_content_key", (q: any) =>
                            q.eq("userId", s.userId).eq("state", "in-progress").eq("contentKey", s.contentKey),
                        )
                        .unique();

                    if (existing) {
                        await ctx.db.patch(existing._id, {
                            state: "completed",
                            durationInSeconds: Math.max(0, Math.round((s.endMs - (existing.occurredAt ?? s.startMs)) / 1000)),
                            languageCode,
                            title,
                        });
                        // Award XP for finalized activity
                        await ctx.runMutation(internal.experienceFunctions.addExperience, {
                            userId: s.userId,
                            languageCode,
                            languageActivityId: existing._id,
                            isApplyingStreakBonus: true,
                            durationInMinutes,
                            deltaExperience: await ctx.runQuery(internal.experienceFunctions.getExperienceForActivity, {
                                userId: s.userId,
                                languageCode,
                                isManuallyTracked: false,
                                contentCategories: contentMediaType ? [contentMediaType] : undefined,
                                durationInMinutes,
                            }),
                        });
                    } else {
                        await ctx.runMutation(internal.languageActivityFunctions.addLanguageActivity, {
                            userId: s.userId,
                            userTargetLanguageId,
                            title,
                            description: undefined,
                            durationInMinutes,
                            occurredAt: s.startMs,
                            contentKey: s.contentKey,
                            languageCode,
                            contentCategories: contentMediaType ? [contentMediaType] : undefined,
                            skillCategories: undefined,
                            isManuallyTracked: false,
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
        }

        return { processed, createdActivities } as const;
    },
});


