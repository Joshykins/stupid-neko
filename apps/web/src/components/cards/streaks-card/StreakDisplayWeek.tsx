"use client";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import * as React from "react";
import { api } from "../../../../../../convex/_generated/api";

type Props = {
	title: string;
	days: number;
	values?: Array<number>;
	onHover: (absoluteIndex: number) => void;
	intensityStyle: (n: number) => React.CSSProperties;
	totalDays: number;
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
		hash +=
			(hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
	}
	return Math.abs(hash) >>> 0;
}

export default function StreakDisplayWeek({
	title,
	days,
	values,
	onHover,
	intensityStyle,
	totalDays,
	liveVersion = false,
	activityCounts,
	vacationFlags,
}: Props) {
	const streakData = useQuery(
		api.userStreakFunctions.getStreakDataForHeatmap,
		liveVersion ? { days } : "skip",
	);
	const effectiveTotalDays = streakData?.totalDays ?? totalDays ?? days;
	const renderValues = React.useMemo(() => {
		if (liveVersion && streakData && streakData.values.length === days)
			return streakData.values;
		return values ?? new Array(effectiveTotalDays).fill(0);
	}, [streakData, values, days, effectiveTotalDays, liveVersion]);

	const daysToShow = Math.min(7, effectiveTotalDays);
	const weekStart = Math.max(0, effectiveTotalDays - daysToShow);
	const items: Array<{
		absoluteIndex: number;
		intensity: number;
		minutes: number;
		isVacation: boolean;
	}> = [];
	for (let i = 0; i < daysToShow; i++) {
		const absoluteIndex = weekStart + i;
		const intensity = renderValues[absoluteIndex] ?? 0;
		const minutes = liveVersion
			? streakData?.activityCounts &&
				streakData.activityCounts.length === effectiveTotalDays
				? (streakData.activityCounts[absoluteIndex] ?? 0)
				: intensity > 0
					? 1
					: 0
			: activityCounts && activityCounts.length === effectiveTotalDays
				? (activityCounts[absoluteIndex] ?? 0)
				: intensity > 0
					? 1
					: 0;
		const isVacation = liveVersion
			? Boolean(
				streakData?.vacationFlags?.[absoluteIndex],
			)
			: Boolean(vacationFlags?.[absoluteIndex]);
		items.push({ absoluteIndex, intensity, minutes, isVacation });
	}

	const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short" });
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const startDate = new Date(
		today.getTime() - (effectiveTotalDays - 1) * 24 * 60 * 60 * 1000,
	);

	return (
		<div className="w-full p-3">
			<div className="grid grid-cols-7 gap-2 sm:gap-3">
				{items.map((it, i) => {
					const seed = hashStringToSeed(
						`${title}-week-${effectiveTotalDays}-${i}`,
					);
					const rng = createSeededRng(seed);
					const delay = 0.1 + rng() * 0.6;
					const hasActivity =
						it.minutes > 0 || it.intensity > 0 || it.isVacation;
					const isVacation = it.isVacation;
					const baseStyle: React.CSSProperties = isVacation
						? { backgroundColor: "var(--color-vacation, #10B981)" }
						: hasActivity
							? { ...intensityStyle(Math.max(1, Math.min(4, it.intensity))) }
							: { backgroundColor: "var(--color-heatmap-bg)" };
					const gradientOverlay: React.CSSProperties =
						hasActivity && !isVacation
							? {
								backgroundImage:
									"linear-gradient(180deg, rgba(255,255,255,0.35), rgba(0,0,0,0.06))",
							}
							: {};

					const dayDate = new Date(startDate);
					dayDate.setDate(dayDate.getDate() + it.absoluteIndex);
					const label = dayFormatter.format(dayDate);

					const size = hasActivity ? 28 : 18;

					return (
						<div
							key={`week-${it.absoluteIndex}`}
							className="flex flex-col items-center justify-start gap-1"
						>
							<div
								className="relative flex items-center justify-center"
								style={{ width: 32, height: 32 }}
							>
								{hasActivity && !isVacation && (
									<div className="absolute -inset-1 rounded-full blur-sm overflow-hidden pointer-events-none">
										<div
											className="absolute inset-0 aspect-square -translate-y-[47%] scale-y-30 opacity-100"
											style={{
												backgroundImage: `linear-gradient(90deg,
                                                    var(--color-heatmap-4) 0%,
                                                    var(--color-heatmap-3) 25%,
                                                    var(--color-heatmap-2) 50%,
                                                    var(--color-heatmap-3) 75%,
                                                    var(--color-heatmap-4) 100%
                                                )`,
											}}
										/>
									</div>
								)}
								<motion.div
									className="rounded-full border border-black shadow-sm bg-foreground"
									style={{
										width: size,
										height: size,
										...baseStyle,
										...gradientOverlay,
									}}
									onMouseEnter={() => onHover(it.absoluteIndex)}
									initial={{ opacity: 0, scale: 0.9 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{ duration: 0.6, delay }}
								/>
							</div>
							<div className="text-xs leading-none text-main-foreground opacity-80 select-none h-4 flex items-center justify-center whitespace-nowrap">
								{label}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
