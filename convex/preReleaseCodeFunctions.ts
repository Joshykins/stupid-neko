import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

function randomChars(n: number): string {
    let out = "";
    for (let i = 0; i < n; i++) {
        const idx = Math.floor(Math.random() * ALPHABET.length);
        out += ALPHABET[idx];
    }
    return out;
}

function normalizeCode(input: string): { formatted: string; normalized: string } {
    const letters = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const a = letters.slice(0, 4);
    const b = letters.slice(4, 8);
    const c = letters.slice(8, 12);
    const parts = [a, b, c].filter(Boolean);
    const formatted = parts.join("-");
    return { formatted, normalized: letters.slice(0, 12) };
}

export const validateCode = query({
    args: { code: v.string() },
    returns: v.object({ valid: v.boolean(), reason: v.optional(v.string()), message: v.optional(v.string()), formatted: v.optional(v.string()) }),
    handler: async (ctx, args) => {
        const { formatted, normalized } = normalizeCode(args.code);
        const found = await ctx.db
            .query("preReleaseCodes")
            .withIndex("by_normalized_code", (q) => q.eq("normalizedCode", normalized))
            .unique();
        if (!found) {
            return { valid: false, reason: "Code not found", formatted } as const;
        }
        if (found.used) {
            return { valid: false, reason: "Code already used", formatted } as const;
        }

        return { valid: true, message: found.message, formatted } as const;
    },
});

export const redeem = mutation({
    args: { code: v.string() },
    returns: v.object({ success: v.boolean(), reason: v.optional(v.string()) }),
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return { success: false, reason: "Unauthorized" } as const;

        const { normalized } = normalizeCode(args.code);
        const found = await ctx.db
            .query("preReleaseCodes")
            .withIndex("by_normalized_code", (q) => q.eq("normalizedCode", normalized))
            .unique();
        if (!found) {
            return { success: false, reason: "Code not found" } as const;
        }
        if (found.used) {
            return { success: false, reason: "Code already used" } as const;
        }

        await ctx.db.patch(found._id, {
            used: true,
            usedBy: userId,
            usedAt: Date.now(),
        } as any);
        await ctx.db.patch(userId, { preReleaseGranted: true } as any);
        return { success: true } as const;
    },
});

export const createPreReleaseAccessCode = internalMutation({
    args: {
        message: v.string(),
    },
    returns: v.array(v.string()),
    handler: async (ctx, args) => {

        if(!args.message) {
            throw new Error("Message is required");
        }
        const created: Array<string> = [];
        const length =  12;
            // ensure uniqueness by checking index
            let code: string;
            // eslint-disable-next-line no-constant-condition
        while (true) {
            const letters = randomChars(length);
            const a = letters.slice(0, 4);
            const b = letters.slice(4, 8);
            const c = letters.slice(8, 12);
            code = [a, b, c].filter(Boolean).join("-");
            const { normalized } = normalizeCode(code);
            const existing = await ctx.db
                .query("preReleaseCodes")
                .withIndex("by_normalized_code", (q) => q.eq("normalizedCode", normalized))
                .unique();
            if (!existing) break;
        }
        await ctx.db.insert("preReleaseCodes", {
            code,
            normalizedCode: normalizeCode(code).normalized,
            message: args.message,
            used: false,
            usedBy: undefined,
            usedAt: undefined,
        } as any);

        created.push(code);
        return created;
    },
});

export const getAccessStatus = query({
    args: {},
    returns: v.object({ granted: v.boolean() }),
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return { granted: false } as const;
        const user = await ctx.db.get(userId);
        const granted = Boolean((user as any)?.preReleaseGranted === true);
        return { granted } as const;
    },
});


