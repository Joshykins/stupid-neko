"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { motion } from "framer-motion";
import { useCountUp } from "../lib/useCountUp";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Badge } from "./ui/badge";
import { calculateStreakBonusPercent } from "../../../../lib/streakBonus";
import HeatmapProgress from "./ui/heatmap-progress";

// Heatmap normalization behavior (easy-to-tune constants)
// - The color saturates when a day's activity count reaches this fraction of the average
// - The average can be computed over active days only (counts > 0) or all days
const HEATMAP_SATURATION_FRACTION_OF_AVERAGE = 1.2; // 80%
const HEATMAP_AVERAGE_ACTIVE_DAYS_ONLY = true; // consider only days with > 0 activities
const HEATMAP_INTENSITY_STEPS = 5; // discrete steps including 0 (maps to 0..4)

type HeatmapProps = {
    title?: string;
    days?: number; // number of days to render from oldest -> newest
    // 0-4 intensity values, oldest -> newest, length should be >= days
    values?: Array<number>;
    cellSize?: number; // px
    liveVersion?: boolean;
};

// Deterministic seeded RNG to avoid SSR/CSR hydration mismatches
function createSeededRng(seedInput: number): () => number {
    // LCG parameters from Numerical Recipes
    let seed = seedInput % 2147483647;
    if (seed <= 0) seed += 2147483646;
    return () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
    };
}

function hashStringToSeed(label: string): number {
    // FNV-1a 32-bit
    let hash = 2166136261;
    for (let i = 0; i < label.length; i++) {
        hash ^= label.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return Math.abs(hash) >>> 0;
}

// Simple neobrutalist GitHub-like heatmap for the hero.
// Internal Heatmap component that handles the actual rendering
function HeatmapInternal({ title = "Daily Streak", days = 365, values, cellSize = 12, liveVersion = false }: HeatmapProps) {
    // Get real streak data when authenticated
    const streakData = useQuery(api.streakFunctions.getStreakDataForHeatmap, { days });

    // Use real data if available and authenticated, otherwise use provided values or generate demo
    const effectiveValues = React.useMemo(() => {
        if (streakData && streakData.values.length === days) {
            return streakData.values;
        }
        return values;
    }, [streakData, values, days]);

    const effectiveDays = streakData?.totalDays ?? days;
    const totalDays = effectiveDays;
    const weeksCount = Math.ceil(totalDays / 7);
    const startDate = React.useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - (totalDays - 1));
        return d;
    }, [totalDays]);

    // Track container width to compute how many weeks to display responsively
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [containerWidth, setContainerWidth] = React.useState<number>(0);
    const [containerHeight, setContainerHeight] = React.useState<number>(0);
    React.useEffect(() => {
        if (!containerRef.current) return;
        const el = containerRef.current;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const width = entry.contentRect.width;
                const height = entry.contentRect.height;
                setContainerWidth(width);
                setContainerHeight(height);
            }
        });
        ro.observe(el);
        const rect = el.getBoundingClientRect();
        setContainerWidth(rect.width);
        setContainerHeight(rect.height);
        return () => ro.disconnect();
    }, []);

    // Generate demo values if not provided (deterministic across SSR/CSR)
    const demoValues = React.useMemo(() => {
        if (effectiveValues && effectiveValues.length === totalDays) return effectiveValues;
        const seed = hashStringToSeed(`${title}-${totalDays}-${weeksCount}`);
        const rng = createSeededRng(seed);
        const arr: Array<number> = [];
        for (let i = 0; i < totalDays; i++) {
            // Slightly increasing recent activity
            const weekIdx = Math.floor(i / 7);
            const bias = Math.min(4, Math.floor((weekIdx / weeksCount) * 5));
            const v = Math.max(0, Math.min(4, Math.floor(rng() * 3) + bias - 1));
            arr.push(v);
        }
        // Also do streak


        return arr;
    }, [effectiveValues, totalDays, weeksCount, title]);

    // Compute normalized intensities (0..HEATMAP_INTENSITY_STEPS-1) from minutes learned using average-based saturation
    const normalizedValues: Array<number> | null = React.useMemo(() => {
        if (!streakData || !streakData.activityCounts || streakData.activityCounts.length !== totalDays) {
            return null;
        }
        const minutes = streakData.activityCounts; // now represents minutes learned
        const countsForAverage = HEATMAP_AVERAGE_ACTIVE_DAYS_ONLY ? minutes.filter((c) => c > 0) : minutes;
        const average = countsForAverage.length > 0 ? countsForAverage.reduce((sum, c) => sum + c, 0) / countsForAverage.length : 0;
        const saturateAt = average * HEATMAP_SATURATION_FRACTION_OF_AVERAGE;
        if (saturateAt <= 0) {
            return minutes.map(() => 0);
        }
        const maxStep = HEATMAP_INTENSITY_STEPS - 1;
        return minutes.map((m) => {
            if (m > 0 && saturateAt > 0) {
                const fraction = Math.min(1, Math.max(0, m / saturateAt));
                return Math.max(1, Math.round(fraction * maxStep));
            }
            return 0;
        });
    }, [streakData, totalDays]);

    // Choose which values to render: prefer normalized if available, otherwise provided/effective or demo
    const renderValues: Array<number> = React.useMemo(() => {
        if (normalizedValues && normalizedValues.length === totalDays) return normalizedValues;
        if (effectiveValues && effectiveValues.length === totalDays) return effectiveValues;
        return demoValues;
    }, [normalizedValues, effectiveValues, demoValues, totalDays]);


    // Responsive: show as many weeks as fit in the container
    const innerWidth = Math.max(0, containerWidth - 4); // account for 2px container borders
    const approxCellWithBorder = cellSize + 1; // px per column
    const maxVisibleWeeks = innerWidth > 0 ? Math.max(1, Math.floor(innerWidth / approxCellWithBorder)) : weeksCount;
    const visibleWeeks = Math.min(weeksCount, maxVisibleWeeks);
    const visibleDays = visibleWeeks * 7;
    const startIndex = Math.max(0, renderValues.length - visibleDays);

    const columns: Array<Array<number>> = [];
    for (let w = 0; w < visibleWeeks; w++) {
        const start = startIndex + w * 7;
        const slice = renderValues.slice(start, start + 7);
        // pad last week to full 7 for grid alignment
        while (slice.length < 7) slice.push(0);
        columns.push(slice);
    }

    // Heat palette via CSS variables for theming
    const intensityStyle = (n: number): React.CSSProperties => {
        const colors = [
            "var(--color-heatmap-bg)",
            "var(--color-heatmap-0)",
            "var(--color-heatmap-1)",
            "var(--color-heatmap-2)",
            "var(--color-heatmap-3)",
            "var(--color-heatmap-4)",
        ];
        return { backgroundColor: colors[Math.max(0, Math.min(4, n))] };
    };

    // Compute trailing non-zero streak
    let streak = 0;
    if (streakData) {
        // Use real streak data when available
        streak = streakData.currentStreak;
    } else {
        // Fall back to computed streak from demo values
        for (let i = renderValues.length - 1; i >= 0; i--) {
            if (renderValues[i] > 0) streak++;
            else break;
        }
    }

    type TooltipState = { visible: boolean; x: number; y: number; label: string; };
    const [tooltip, setTooltip] = React.useState<TooltipState>({ visible: false, x: 0, y: 0, label: "" });
    const tooltipRef = React.useRef<HTMLDivElement | null>(null);
    const [tooltipSize, setTooltipSize] = React.useState<{ w: number; h: number; }>({ w: 0, h: 0 });
    React.useLayoutEffect(() => {
        if (tooltipRef.current) {
            setTooltipSize({ w: tooltipRef.current.offsetWidth, h: tooltipRef.current.offsetHeight });
        }
    }, [tooltip.visible, tooltip.label]);
    const anchorOffset = 12;
    const onCellEnter = (absoluteIndex: number, value: number) => {
        if (absoluteIndex >= totalDays) return;
        const day = new Date(startDate);
        day.setDate(day.getDate() + absoluteIndex);

        // Get the actual minutes learned for this day if we have real data
        let minutesLearned = 0;
        if (streakData && streakData.activityCounts && streakData.activityCounts.length === totalDays) {
            minutesLearned = streakData.activityCounts[absoluteIndex] ?? 0;
        }

        // Create fire emoji representation for intensity
        const fireEmojis = "🔥".repeat(value);
        const intensityText = value > 0 ? fireEmojis : "No activity";

        // Create a more descriptive label
        let label: string;
        if (minutesLearned > 0) {
            const mins = Math.max(0, Math.floor(minutesLearned));
            label = `${day.toLocaleDateString(undefined, { month: "short", day: "numeric" })} • ${mins} min ${fireEmojis}`;
        } else {
            label = `${day.toLocaleDateString(undefined, { month: "short", day: "numeric" })} • ${intensityText}`;
        }

        setTooltip((t) => ({ ...t, visible: true, label }));
    };
    const onContainerMove = (ev: React.MouseEvent<HTMLDivElement>) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setTooltip((t) => (t.visible ? { ...t, x: ev.clientX - rect.left + anchorOffset, y: ev.clientY - rect.top + anchorOffset } : t));
    };
    const onContainerLeave = () => setTooltip({ visible: false, x: 0, y: 0, label: "" });

    const streakBonusPercent = calculateStreakBonusPercent(streakData?.currentStreak ?? 0);
    const isMarketingView = !liveVersion;
    const [demoPercent, setDemoPercent] = React.useState<number>(0);
    React.useEffect(() => {
        if (isMarketingView) {
            setDemoPercent(0);
            const t = window.setTimeout(() => setDemoPercent(100), 50);
            return () => window.clearTimeout(t);
        } else {
            setDemoPercent(0);
        }
    }, [isMarketingView]);
    const displayedPercent = isMarketingView ? demoPercent : streakBonusPercent;

    // Refs for animated counts (must be called unconditionally to obey Rules of Hooks)
    const titleCountUpRef = useCountUp(streak);
    const bonusCountUpRef = useCountUp(displayedPercent);

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="font-display text-lg font-black tracking-tight text-main-foreground flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                        {title}
                        <span className="inline-flex items-center gap-1 text-lg font-black">
                            <svg width="16" height="18" viewBox="0 0 16 18" aria-hidden>
                                <path d="M8 1 C10 4 5 6 8 9 C10 11 12 9 12 7 C14 9 15 11 15 13 C15 15.761 12.761 18 10 18 H6 C3.239 18 1 15.761 1 13 C1 9 4 6 6 4 C6.5 3.5 7.5 2.5 8 1 Z" fill="#F59E0B" stroke="#000" strokeWidth="2" />
                            </svg>
                            <span ref={titleCountUpRef} />
                        </span>
                    </div>
                    {/* Streak Bonus Indicator */}
                    <div className="flex items-center gap-2">
                        <Badge className="bg-[var(--color-heatmap-1)]">
                            <div className="inline-flex items-center font-bold text-base text-main-foreground">
                                <span ref={bonusCountUpRef} />% XP Bonus

                            </div>
                        </Badge>
                    </div>
                </CardTitle>
                {/* Streak progress to max streak */}
                {(
                    <HeatmapProgress value={displayedPercent} />
                )}
            </CardHeader>
            <CardContent className="px-4">
                <div ref={containerRef} className="w-full rounded-md overflow-hidden border-2 border-black bg-heatmap-bg relative" onMouseMove={onContainerMove} onMouseLeave={onContainerLeave}>
                    {/* Reserve space to avoid layout jump */}
                    {(() => {
                        const columnWidth = innerWidth > 0 ? innerWidth / visibleWeeks : cellSize;
                        const cs = Math.max(10, Math.floor(columnWidth) - 1);
                        const gridMinHeight = cs * 7;
                        return (
                            <div style={{ minHeight: gridMinHeight }}>
                                {containerWidth > 0 && (
                                    <div
                                        className="grid gap-0 select-none w-full"
                                        style={{ gridTemplateColumns: `repeat(${visibleWeeks}, 1fr)`, }}
                                    >
                                        {columns.map((week, wi) => (
                                            <div key={wi} className="grid grid-rows-7 gap-0">
                                                {week.map((v, di) => {
                                                    const relativeIndex = wi * 7 + di;
                                                    const absoluteIndex = startIndex + relativeIndex; // Corrected for visible window offset
                                                    const inRange = absoluteIndex < totalDays;
                                                    const cs2 = cs;
                                                    const seed = hashStringToSeed(`${title}-${totalDays}-${wi}-${di}`);
                                                    const rng = createSeededRng(seed);
                                                    const delay = 0.1 + rng() * 0.7; // 100–800ms
                                                    return (
                                                        <motion.div
                                                            key={`${wi}-${di}`}
                                                            className="border border-black"
                                                            style={{ width: "100%", height: cs2, ...intensityStyle(v) }}
                                                            onMouseEnter={inRange ? () => onCellEnter(absoluteIndex, v) : undefined}
                                                            initial={{ opacity: 0, scale: 0.96 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ duration: 0.6, delay }}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                    {tooltip.visible && (
                        <div
                            ref={tooltipRef}
                            className="pointer-events-none absolute z-20 grid items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs border-2 border-border shadow-shadow bg-foreground"
                            style={{
                                left: Math.max(8, Math.min(tooltip.x, Math.max(8, containerWidth - tooltipSize.w - 8))),
                                top: Math.max(8, Math.min(tooltip.y, Math.max(8, containerHeight - tooltipSize.h - 8))),
                            }}
                        >
                            {tooltip.label}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// Export the main Heatmap component
export function Heatmap(props: HeatmapProps) {
    return <HeatmapInternal {...props} />;
}

export default Heatmap;


