// -------------------------------
// Constants (easy to tweak here)
// -------------------------------
const BASE_A = 150;   // flat XP base
const BASE_B = 30;    // linear growth factor
const BASE_C = 1;     // quadratic growth factor
const CAP_LEVEL = 200; // after this, step cost stays flat

// -------------------------------
// Functions
// -------------------------------

/**
 * XP required to go from level L to L+1.
 * This is capped so that after CAP_LEVEL,
 * the cost stays constant at the CAP_LEVEL value.
 */
export function xpForNextLevel(level: number): number {
  if (level <= CAP_LEVEL) {
    return BASE_A + BASE_B * (level - 1) + BASE_C * (level - 1) ** 2;
  }
  return BASE_A + BASE_B * (CAP_LEVEL - 1) + BASE_C * (CAP_LEVEL - 1) ** 2;
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


