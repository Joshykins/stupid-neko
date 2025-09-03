import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { languageCodeValidator } from "./schema";
import {
    applyExperience,
    type ApplyExperienceResult,
} from "../lib/levelAndExperienceCalculations/levelAndExperienceCalculator";
import { internal } from "./_generated/api";

/* ------------------- XP constants & helpers ------------------- */

// Target calibration: ~100 XP per hour of baseline study (reading)
const HOUR_XP = 100;
const BASE_RATE_PER_MIN = HOUR_XP / 60; // ≈ 1.6667

const SKILL_WEIGHTS = {
  listening: 1,
  reading:   1.5,
  writing:   2.0,
  speaking:  2.0,
} as const;

const RAMP_IN_MIN = 5;           // 0→100% credit over first 5 minutes
const DIMINISH_AFTER_MIN = 90;   // minutes after this count at 50%
const DIMINISH_FACTOR = 0.5;
const MAX_ENTRY_MIN = 300;       // hard cap at 5h

// ✅ Manual-only per-entry XP cap (pre-streak)
const MAX_MANUAL_XP_PER_ENTRY = 300;

type Skill = keyof typeof SKILL_WEIGHTS;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function rampInFactor(minutes: number): number {
  if (minutes <= 0) return 0;
  if (minutes >= RAMP_IN_MIN) return 1;
  return minutes / RAMP_IN_MIN;
}
function effectiveMinutes(rawMinutes: number): number {
  const m = clamp(Math.round(rawMinutes), 0, MAX_ENTRY_MIN);
  if (m <= DIMINISH_AFTER_MIN) return m;
  const extra = m - DIMINISH_AFTER_MIN;
  return DIMINISH_AFTER_MIN + extra * DIMINISH_FACTOR;
}
/** Pick primary skill: prefer most effortful if multiple; infer from content; default reading. */
function pickPrimarySkill(
  skillCategories?: ReadonlyArray<"listening" | "reading" | "speaking" | "writing">,
  contentCategories?: ReadonlyArray<"audio" | "video" | "text" | "other">
): Skill {
  const preference: Skill[] = ["speaking", "writing", "reading", "listening"]; // high → low
  if (skillCategories?.length) for (const s of preference) if (skillCategories.includes(s)) return s;
  if (contentCategories?.length) {
    if (contentCategories.includes("audio") || contentCategories.includes("video")) return "listening";
    if (contentCategories.includes("text")) return "reading";
  }
  return "reading";
}

export const getExperienceForActivity = internalQuery({
  args: {
    userId: v.id("users"),
    languageCode: languageCodeValidator,
    isManuallyTracked: v.optional(v.boolean()),
    contentCategories: v.optional(
      v.array(v.union(v.literal("audio"), v.literal("video"), v.literal("text"), v.literal("other")))
    ),
    skillCategories: v.optional(
      v.array(v.union(v.literal("listening"), v.literal("reading"), v.literal("speaking"), v.literal("writing")))
    ),
    durationInMinutes: v.optional(v.number()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const {
      isManuallyTracked,
      contentCategories,
      skillCategories,
      durationInMinutes,
    } = args;

    const minutes = durationInMinutes ?? 0;
    if (minutes <= 0) return 0;

    const primarySkill = pickPrimarySkill(skillCategories ?? [], contentCategories ?? []);
    const weight = SKILL_WEIGHTS[primarySkill];

    const minutesEff = effectiveMinutes(minutes);
    const ramp = rampInFactor(minutes); // ramp uses raw minutes for tiny-session discount

    const rawXp = BASE_RATE_PER_MIN * minutesEff * weight * ramp;

    // Manual-only cap (pre-streak). Auto-tracked items bypass this.
    const cappedXp = isManuallyTracked ? Math.min(rawXp, MAX_MANUAL_XP_PER_ENTRY) : rawXp;

    return Math.max(0, Math.round(cappedXp));
  },
});


export const addExperience = internalMutation({
    args: {
        userId: v.id("users"),
        languageCode: languageCodeValidator,
        deltaExperience: v.number(),
        languageActivityId: v.optional(v.id("languageActivities")),
        isApplyingStreakBonus: v.optional(v.boolean()),
        durationInMinutes: v.optional(v.number()),
    },
    returns: v.object({
        userTargetLanguageId: v.id("userTargetLanguages"),
        result: v.object({
            previousTotalExperience: v.number(),
            newTotalExperience: v.number(),
            previousLevel: v.number(),
            newLevel: v.number(),
            levelsGained: v.number(),
            remainderTowardsNextLevel: v.number(),
            nextLevelCost: v.number(),
            lastLevelCost: v.number(),
        }),
    }),
    handler: async (ctx, args) => {
        const { userId, languageCode } = args;
        let adjustedDelta = Math.floor(args.deltaExperience ?? 0);

        if (args.isApplyingStreakBonus) {
            const multiplier: number = await ctx.runQuery(internal.streakFunctions.getStreakBonusMultiplier, { userId });
            adjustedDelta = Math.floor(adjustedDelta * Math.max(0, multiplier));
        }

        const userTargetLanguage = await ctx.db
            .query("userTargetLanguages")
            .withIndex("by_user_and_language", (q: any) =>
                q.eq("userId", userId).eq("languageCode", languageCode),
            )
            .unique();

        if (!userTargetLanguage) {
            throw new Error(`User target language not found for user ${userId} and language ${languageCode}`);
        }

        const previousTotal = userTargetLanguage.totalExperience ?? 0;
        const result: ApplyExperienceResult = applyExperience({
            currentTotalExperience: previousTotal,
            deltaExperience: adjustedDelta,
        });

        // Update existing user target language
        const currentTotalMinutes = userTargetLanguage.totalMinutesLearning ?? 0;
        const newTotalMinutes = currentTotalMinutes + (args.durationInMinutes ?? 0);
        
        await ctx.db.patch(userTargetLanguage._id, {
            totalExperience: result.newTotalExperience,
            totalMinutesLearning: newTotalMinutes,
        });

        // Insert experience record
        const userTargetLanguageExperienceId = await ctx.db
            .insert("userTargetLanguageExperiences", {
                userId,
                userTargetLanguageId: userTargetLanguage._id,
                languageActivityId: args.languageActivityId,
                experience: result.newTotalExperience,
            });

        // If streak bonus was applied, record the multiplier
        if (args.isApplyingStreakBonus) {
            const multiplier: number = await ctx.runQuery(internal.streakFunctions.getStreakBonusMultiplier, { userId });
            if (multiplier > 0) {
                await ctx.db.insert("userTargetLanguageExperiencesMultipliers", {
                    userId,
                    type: "streak" as const,
                    userTargetLanguageId: userTargetLanguage._id,
                    userTargetLanguageExperienceId,
                    multiplier,
                });
            }
        }

        return { userTargetLanguageId: userTargetLanguage._id, result };
    },
});


