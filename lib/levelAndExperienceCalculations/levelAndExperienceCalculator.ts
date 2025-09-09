// -------------------------------
// Constants (easy to tweak here)
// -------------------------------
const BASE_A = 150;   // flat XP base
const BASE_B = 17;    // linear growth factor
const BASE_C = 2;     // quadratic growth factor
const CAP_LEVEL = 51; // after this, step cost stays flat
const EXPONENT = 2;

// -------------------------------
// Functions
// -------------------------------

/**
 * XP required to reach the last level.
 * @param level The level to get the XP for
 * @returns 
 */
export function xpForLastLevel(level: number): number {
  if (level <= CAP_LEVEL) {
    return BASE_A + BASE_B * (level - 1) + BASE_C * (level - 1) ** EXPONENT;
  }
  return BASE_A + BASE_B * (CAP_LEVEL - 1) + BASE_C * (CAP_LEVEL - 1) ** EXPONENT;
}

/**
 * XP required to go from level L to L+1.
 * This is capped so that after CAP_LEVEL,
 * the cost stays constant at the CAP_LEVEL value.
 */
export function xpForNextLevel(level: number): number {
  if (level <= CAP_LEVEL) {
    return BASE_A + BASE_B * (level - 1) + BASE_C * (level - 1) ** EXPONENT;
  }
  return BASE_A + BASE_B * (CAP_LEVEL - 1) + BASE_C * (CAP_LEVEL - 1) ** EXPONENT;
}

/**
 * Total XP required to reach a given level.
 * This sums up the step costs up to (level - 1).
 * Uses xpForNextLevel internally, so it respects the cap.
 */
export function totalXpForLevel(level: number): number {
  if (level < 1) return 0;

  let total = 0;
  for (let i = 1; i < level; i++) {
    total += xpForNextLevel(i);
  }
  return total;
}

/**
 * Given an XP value, return the current level and leftover XP.
 * This walks up levels until the XP pool is exhausted.
 */
export function levelFromXp(xp: number): { level: number; remainder: number } {
  if (xp <= 0) return { level: 1, remainder: 0 };

  let level = 1;
  let remaining = xp;

  while (true) {
    const cost = xpForNextLevel(level);
    if (remaining < cost) {
      return { level, remainder: remaining };
    }
    remaining -= cost;
    level++;
  }
}

export type ApplyExperienceInput = {
  currentTotalExperience: number;
  deltaExperience: number;
};

export type ApplyExperienceResult = {
  previousTotalExperience: number;
  newTotalExperience: number;
  previousLevel: number;
  newLevel: number;
  levelsGained: number;
  remainderTowardsNextLevel: number;
  nextLevelCost: number;
  lastLevelCost: number;
};

/**
 * Pure helper to apply an experience delta to a running total and
 * compute level progression details. Does not perform any I/O.
 */
export function applyExperience(
  args: ApplyExperienceInput,
): ApplyExperienceResult {
  const previousTotal = Math.max(0, Math.floor(args.currentTotalExperience || 0));
  const delta = Math.floor(args.deltaExperience || 0);

  // Future: apply multipliers here when implemented
  const effectiveDelta = delta; // args.applyMultipliers ?? true

  const newTotal = Math.max(0, previousTotal + effectiveDelta);

  const { level: previousLevel } = levelFromXp(previousTotal);
  const { level: newLevel, remainder } = levelFromXp(newTotal);

  return {
    previousTotalExperience: previousTotal,
    newTotalExperience: newTotal,
    previousLevel,
    newLevel,
    levelsGained: Math.max(0, newLevel - previousLevel),
    remainderTowardsNextLevel: remainder,
    nextLevelCost: xpForNextLevel(newLevel),
    lastLevelCost: xpForLastLevel(newLevel),
  };
}