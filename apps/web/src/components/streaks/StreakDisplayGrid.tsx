"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";


type Props = {
    title: string;
    days: number;
    values?: Array<number>;
    cellSize: number;
    onHover: (absoluteIndex: number, value: number) => void;
    intensityStyle: (n: number) => React.CSSProperties;
    startDate: Date;
    liveVersion?: boolean;
    activityCounts?: Array<number> | undefined;
    vacationFlags?: Array<boolean> | undefined;
};

function createSeededRng(seedInput: number): () => number {
    let seed = seedInput % 2147483647;
    if (seed <= 0) seed += 2147483646;
    return () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
    };
}

function hashStringToSeed(label: string): number {
    let hash = 2166136261;
    for (let i = 0; i < label.length; i++) {
        hash ^= label.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return Math.abs(hash) >>> 0;
}

export default function StreakDisplayGrid({ title, days, values, cellSize, onHover, intensityStyle, startDate, liveVersion = false, activityCounts, vacationFlags }: Props) {
    const streakData = useQuery(api.streakFunctions.getStreakDataForHeatmap, liveVersion ? { days } : "skip");
    const totalDays = streakData?.totalDays ?? days;
    const effectiveValues = React.useMemo(() => {
        if (liveVersion && streakData && streakData.values.length === days) return streakData.values;
        return values ?? new Array(totalDays).fill(0);
    }, [streakData, values, days, liveVersion, totalDays]);

    const weeksCount = Math.ceil(totalDays / 7);

    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [containerWidth, setContainerWidth] = React.useState<number>(0);
    React.useEffect(() => {
        if (!containerRef.current) return;
        const el = containerRef.current;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) setContainerWidth(entry.contentRect.width);
        });
        ro.observe(el);
        setContainerWidth(el.getBoundingClientRect().width);
        return () => ro.disconnect();
    }, []);

    const innerWidth = Math.max(0, containerWidth - 4);
    const approxCellWithBorder = cellSize + 1;
    const maxVisibleWeeks = innerWidth > 0 ? Math.max(1, Math.floor(innerWidth / approxCellWithBorder)) : weeksCount;
    const visibleWeeks = Math.min(weeksCount, maxVisibleWeeks);
    const visibleDays = visibleWeeks * 7;
    const startIndex = Math.max(0, (effectiveValues?.length ?? totalDays) - visibleDays);

    const columns: Array<Array<number>> = [];
    const renderValues = effectiveValues ?? new Array(totalDays).fill(0);
    for (let w = 0; w < visibleWeeks; w++) {
        const start = startIndex + w * 7;
        const slice = renderValues.slice(start, start + 7);
        while (slice.length < 7) slice.push(0);
        columns.push(slice);
    }

    const columnWidth = innerWidth > 0 ? innerWidth / visibleWeeks : cellSize;
    const cs = Math.max(10, Math.floor(columnWidth) - 1);

    return (
        <div ref={containerRef} className="w-full rounded-md overflow-hidden border-2 border-black bg-heatmap-bg relative">
            {containerWidth > 0 && (
                <div className="grid gap-0 select-none w-full" style={{ gridTemplateColumns: `repeat(${visibleWeeks}, 1fr)` }}>
                    {columns.map((week, wi) => (
                        <div key={wi} className="grid grid-rows-7 gap-0">
                            {week.map((v, di) => {
                                const relativeIndex = wi * 7 + di;
                                const absoluteIndex = startIndex + relativeIndex;
                                const seed = hashStringToSeed(`${title}-${totalDays}-${wi}-${di}`);
                                const rng = createSeededRng(seed);
                                const delay = 0.1 + rng() * 0.7;
                                const isVacation = liveVersion
                                    ? Boolean(streakData?.vacationFlags && streakData.vacationFlags[absoluteIndex])
                                    : Boolean(vacationFlags && vacationFlags[absoluteIndex]);
                                const style: React.CSSProperties = isVacation
                                    ? { width: "100%", height: cs, backgroundColor: "var(--color-vacation, #10B981)" }
                                    : { width: "100%", height: cs, ...intensityStyle(v) };
                                return (
                                    <motion.div
                                        key={`${wi}-${di}`}
                                        className="border border-black"
                                        style={style}
                                        onMouseEnter={() => onHover(absoluteIndex, v)}
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
}


