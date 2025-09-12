import { internalQuery, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { languageCodeValidator } from "./schema";

export const getCurrentTargetLanguage = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.null(),
    v.object({
      languageCode: v.optional(languageCodeValidator),
    })
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.currentTargetLanguageId) return null;
    const rec = await ctx.db.get(user.currentTargetLanguageId);
    if (!rec) return null;
    return { languageCode: rec.languageCode };
  },
});

export const listAllUsersForCron = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
    })
  ),
  handler: async (ctx) => {
    const rows = await ctx.db.query("users").take(10000);
    return rows.map((r) => ({ _id: r._id }));
  },
});


