"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type HeatmapProps = {
    title?: string;
    days?: number; // number of days to render from oldest -> newest
    // 0-4 intensity values, oldest -> newest, length should be >= days
    values?: Array<number>;
    cellSize?: number; // px
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
export function Heatmap({ title = "Daily Streak", days = 365, values, cellSize = 12 }: HeatmapProps) {
    const totalDays = days;
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
        if (values && values.length === totalDays) return values;
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
        return arr;
    }, [values, totalDays, weeksCount, title]);

    // Responsive: show as many weeks as fit in the container
    const innerWidth = Math.max(0, containerWidth - 4); // account for 2px container borders
    const approxCellWithBorder = cellSize + 1; // px per column
    const maxVisibleWeeks = innerWidth > 0 ? Math.max(1, Math.floor(innerWidth / approxCellWithBorder)) : weeksCount;
    const visibleWeeks = Math.min(weeksCount, maxVisibleWeeks);
    const visibleDays = visibleWeeks * 7;
    const startIndex = Math.max(0, demoValues.length - visibleDays);

    const columns: Array<Array<number>> = [];
    for (let w = 0; w < visibleWeeks; w++) {
        const start = startIndex + w * 7;
        const slice = demoValues.slice(start, start + 7);
        // pad last week to full 7 for grid alignment
        while (slice.length < 7) slice.push(0);
        columns.push(slice);
    }

    // Heat palette (cream -> yellow -> orange -> red)
    const intensityStyle = (n: number): React.CSSProperties => {
        const colors = ["#F4E6D4", "#FDE68A", "#F59E0B", "#EA580C", "#DC2626"];
        return { backgroundColor: colors[Math.max(0, Math.min(4, n))] };
    };

    // Compute trailing non-zero streak
    let streak = 0;
    for (let i = demoValues.length - 1; i >= 0; i--) {
        if (demoValues[i] > 0) streak++;
        else break;
    }

    type TooltipState = { visible: boolean; x: number; y: number; label: string };
    const [tooltip, setTooltip] = React.useState<TooltipState>({ visible: false, x: 0, y: 0, label: "" });
    const tooltipRef = React.useRef<HTMLDivElement | null>(null);
    const [tooltipSize, setTooltipSize] = React.useState<{ w: number; h: number }>({ w: 0, h: 0 });
    React.useLayoutEffect(() => {
        if (tooltipRef.current) {
            setTooltipSize({ w: tooltipRef.current.offsetWidth, h: tooltipRef.current.offsetHeight });
        }
    }, [tooltip.visible, tooltip.label]);
    const anchorOffset = 12;
    const onEnter = (ev: React.MouseEvent<HTMLDivElement>, globalIndex: number, value: number) => {
        if (globalIndex >= totalDays) return;
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const day = new Date(startDate);
        day.setDate(day.getDate() + globalIndex);
        const label = `${day.toLocaleDateString(undefined, { month: "short", day: "numeric" })} • Level ${value}`;
        setTooltip({ visible: true, x: ev.clientX - rect.left + anchorOffset, y: ev.clientY - rect.top + anchorOffset, label });
    };
    const onMove = (ev: React.MouseEvent<HTMLDivElement>) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setTooltip((t) => (t.visible ? { ...t, x: ev.clientX - rect.left + anchorOffset, y: ev.clientY - rect.top + anchorOffset, label: t.label } : t));
    };
    const onLeave = () => setTooltip({ visible: false, x: 0, y: 0, label: "" });

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-display text-lg font-black tracking-tight text-main-foreground flex items-center gap-2">
                    {title}
                    <span className="inline-flex items-center gap-1 text-lg font-black">
                        <svg width="16" height="18" viewBox="0 0 16 18" aria-hidden>
                            <path d="M8 1 C10 4 5 6 8 9 C10 11 12 9 12 7 C14 9 15 11 15 13 C15 15.761 12.761 18 10 18 H6 C3.239 18 1 15.761 1 13 C1 9 4 6 6 4 C6.5 3.5 7.5 2.5 8 1 Z" fill="#F59E0B" stroke="#000" strokeWidth="2" />
                        </svg>
                        {streak}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div ref={containerRef} className="w-full rounded-md overflow-hidden border-2 border-black relative">
                    <div
                        className="grid gap-0 select-none w-full"
                        style={{ gridTemplateColumns: `repeat(${visibleWeeks}, 1fr)` }}
                    >
                    {columns.map((week, wi) => (
                        <div key={wi} className="grid grid-rows-7 gap-0">
                            {week.map((v, di) => {
                                const globalIndex = wi * 7 + di;
                                const columnWidth = innerWidth > 0 ? innerWidth / visibleWeeks : cellSize;
                                const cs = Math.max(10, Math.floor(columnWidth) - 1);
                                return (
                                    <div
                                        key={`${wi}-${di}`}
                                        className="border border-black"
                                        style={{ width: "100%", height: cs, ...intensityStyle(v) }}
                                        onMouseEnter={(e) => onEnter(e, globalIndex, v)}
                                        onMouseMove={onMove}
                                        onMouseLeave={onLeave}
                                    />
                                );
                            })}
                        </div>
                    ))}
                    </div>
                    {tooltip.visible && (
                        <div
                            ref={tooltipRef}
                            className="pointer-events-none absolute z-20 px-2 py-1 rounded-base border-2 border-border bg-main text-main-foreground shadow-shadow text-xs font-bold whitespace-nowrap"
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

export default Heatmap;


