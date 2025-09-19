import { internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { contentSourceValidator, languageCodeValidator, mediaTypeValidator } from "./schema";

export const getByContentKey = internalQuery({
  args: { contentKey: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("contentLabel"),
      contentKey: v.string(),
      stage: v.union(v.literal("queued"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
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
      .query("contentLabel")
      .withIndex("by_content_key", (q: any) => q.eq("contentKey", args.contentKey))
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


