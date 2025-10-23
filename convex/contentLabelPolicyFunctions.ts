import { v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { query, mutation } from './_generated/server';
import { contentSourceValidator } from './schema';

// User-owned Content Label Policy APIs (non-browser-extension specific)
// Moved out of browserExtensionCoreFunctions.ts

export const createUserContentLabelPolicy = mutation({
  args: {
    contentKey: v.string(),
    policyKind: v.union(v.literal('allow'), v.literal('block')),
    source: v.union(contentSourceValidator),
    url: v.optional(v.string()),
    label: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  returns: v.object({ ok: v.boolean(), created: v.boolean() }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const existing = await ctx.db
      .query('userContentLabelPolicies')
      .withIndex('by_user_and_content_key', q => q.eq('userId', userId).eq('contentKey', args.contentKey))
      .unique();
    if (existing) return { ok: true, created: false };

    await ctx.db.insert('userContentLabelPolicies', {
      userId,
      policyKind: args.policyKind,
      contentKey: args.contentKey,
      contentSource: args.source,
      contentUrl: args.url,
      label: args.label,
      note: args.note,
    });
    return { ok: true, created: true };
  },
});

export const listUserContentLabelPolicies = query({
  args: {
    search: v.optional(v.string()),
    source: v.optional(v.union(contentSourceValidator)),
    sort: v.optional(v.union(v.literal('newest'), v.literal('oldest'))),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
    policyKind: v.optional(v.union(v.literal('allow'), v.literal('block'))),
  },
  returns: v.object({
    items: v.array(
      v.object({
        _id: v.id('userContentLabelPolicies'),
        _creationTime: v.number(),
        policyKind: v.union(v.literal('allow'), v.literal('block')),
        contentKey: v.string(),
        contentSource: v.union(contentSourceValidator),
        contentUrl: v.optional(v.string()),
        label: v.optional(v.string()),
        note: v.optional(v.string()),
      })
    ),
    continueCursor: v.optional(v.string()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');

    const limit = Math.max(1, Math.min(100, args.limit ?? 20));

    // Base query: by_user
    let q = ctx.db.query('userContentLabelPolicies').withIndex('by_user', q => q.eq('userId', userId));

    // Filter by source if provided
    if (args.source) {
      q = ctx.db
        .query('userContentLabelPolicies')
        .withIndex('by_user_and_source', q =>
          q
            .eq('userId', userId)
            .eq('contentSource', args.source as 'manual' | 'youtube' | 'spotify' | 'anki' | 'website')
        );
    }

    // Filter by policy kind if provided
    if (args.policyKind) {
      q = ctx.db
        .query('userContentLabelPolicies')
        .withIndex('by_user_and_policy_kind', q => q.eq('userId', userId).eq('policyKind', args.policyKind as 'allow' | 'block'));
    }

    // Sorting by creation time
    const order = args.sort === 'oldest' ? 'asc' : 'desc';
    const page = await q.order(order).paginate({ cursor: args.cursor ?? null, numItems: limit });

    // In-memory search filter (contentKey, label, url)
    const term = (args.search ?? '').trim().toLowerCase();
    const filtered = term
      ? page.page.filter(it =>
          it.contentKey.toLowerCase().includes(term) ||
          (it.label ?? '').toLowerCase().includes(term) ||
          (it.contentUrl ?? '').toLowerCase().includes(term)
        )
      : page.page;

    // Project only fields declared in returns validator
    const items = filtered.map(it => ({
      _id: it._id,
      _creationTime: it._creationTime,
      policyKind: it.policyKind as typeof it.policyKind,
      contentKey: it.contentKey,
      contentSource: it.contentSource as typeof it.contentSource,
      contentUrl: it.contentUrl,
      label: it.label,
      note: it.note,
    }));

    return {
      items,
      continueCursor: page.continueCursor ?? undefined,
      isDone: page.isDone,
    };
  },
});

export const deleteUserContentLabelPolicy = mutation({
  args: { id: v.id('userContentLabelPolicies') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Unauthorized');
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) throw new Error('Not found');
    await ctx.db.delete(args.id);
    return null;
  },
});

