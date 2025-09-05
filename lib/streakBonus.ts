export const HABIT_CAP_DAYS = 21; // choose 7, 14, 21, or 28
export const MAX_MULTIPLIER = 2;
export const BASE_MULTIPLIER = 1;

export function calculateStreakBonusMultiplier(currentStreak: number): number {
    const safeStreak = Math.max(0, currentStreak || 0);
    const p = Math.min(1, safeStreak / HABIT_CAP_DAYS);
    const multiplier = BASE_MULTIPLIER + (MAX_MULTIPLIER - BASE_MULTIPLIER) * p;
    return Number(multiplier.toFixed(3));
}

export function calculateStreakBonusPercent(currentStreak: number): number {
    const p = Math.min(1, Math.max(0, currentStreak || 0) / HABIT_CAP_DAYS);
    return Math.round(p * 100);
}

