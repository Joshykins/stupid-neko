'use client';

import { useQuery } from 'convex/react';
import { motion } from 'framer-motion';
import * as React from 'react';
import { api } from '../../../../../../convex/_generated/api';

type Props = {
	title: string;
	days: number;
	values?: Array<number>;
	onHover: (absoluteIndex: number, value: number) => void;
	intensityStyle: (n: number) => React.CSSProperties;
	startDate: Date;
	liveVersion?: boolean;
	activityCounts?: Array<number> | undefined;
	vacationFlags?: Array<boolean> | undefined;
	vacationConfig: { backgroundColor: string; opacity: number };
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

export default function StreakDisplayGrid({
	title,
	days,
	values,
	onHover,
	intensityStyle,
	startDate: _startDate,
	liveVersion = false,
	activityCounts: _activityCounts,
	vacationFlags,
	vacationConfig,
}: Props) {
	const streakData = useQuery(
		api.userStreakFunctions.getStreakDataForHeatmap,
		liveVersion ? { days } : 'skip'
	);
	const totalDays = streakData?.totalDays ?? days;
	const effectiveValues = React.useMemo(() => {
		if (liveVersion && streakData && streakData.values.length === days)
			return streakData.values;
		return values ?? new Array(totalDays).fill(0);
	}, [streakData, values, days, liveVersion, totalDays]);

	const weeksCount = Math.ceil(totalDays / 7);

	const containerRef = React.useRef<HTMLDivElement | null>(null);
	const [containerWidth, setContainerWidth] = React.useState<number>(0);
	React.useEffect(() => {
		if (!containerRef.current) return;
		const el = containerRef.current;
		const ro = new ResizeObserver(entries => {
			for (const entry of entries) setContainerWidth(entry.contentRect.width);
		});
		ro.observe(el);
		setContainerWidth(el.getBoundingClientRect().width);
		return () => ro.disconnect();
	}, []);

	const innerWidth = Math.max(0, containerWidth - 4);
	const approxCellWithBorder = 15;
	const maxVisibleWeeks =
		innerWidth > 0
			? Math.max(1, Math.floor(innerWidth / approxCellWithBorder))
			: weeksCount;
	const visibleWeeks = Math.min(weeksCount, maxVisibleWeeks);
	const visibleDays = visibleWeeks * 7;
	const startIndex = Math.max(
		0,
		(effectiveValues?.length ?? totalDays) - visibleDays
	);

	const columns: Array<Array<number>> = [];
	const renderValues = effectiveValues ?? new Array(totalDays).fill(0);
	for (let w = 0; w < visibleWeeks; w++) {
		const start = startIndex + w * 7;
		const slice = renderValues.slice(start, start + 7);
		while (slice.length < 7) slice.push(0);
		columns.push(slice);
	}

	const cs = Math.max(
		10,
		Math.floor((innerWidth - (visibleWeeks - 1) * 2) / visibleWeeks)
	);

	return (
		<div ref={containerRef} className="w-full relative ">
			{containerWidth > 0 && (
				<div className="flex gap-0.5 select-none w-full justify-center py-1">
					{columns.map((week, wi) => (
						<div
							key={`week-${startIndex + wi * 7}`}
							className="flex flex-col gap-0.5"
						>
							{week.map((v, di) => {
								const relativeIndex = wi * 7 + di;
								const absoluteIndex = startIndex + relativeIndex;
								const seed = hashStringToSeed(
									`${title}-${totalDays}-${wi}-${di}`
								);
								const rng = createSeededRng(seed);
								const delay = 0.1 + rng() * 0.7;
								const isVacation = liveVersion
									? Boolean(streakData?.vacationFlags?.[absoluteIndex])
									: Boolean(vacationFlags?.[absoluteIndex]);
								const intensityStyleResult = intensityStyle(v);
								const style: React.CSSProperties = isVacation
									? {
											width: cs,
											height: cs,
											...vacationConfig,
										}
									: {
											width: cs,
											height: cs,
											...intensityStyleResult,
										};
								return (
									<motion.div
										key={`${title}-${totalDays}-${wi}-${di}-${absoluteIndex}`}
										className="border border-black rounded-xs"
										style={style}
										onMouseEnter={() => onHover(absoluteIndex, v)}
										initial={{ opacity: 0, scale: 0.96 }}
										animate={{
											opacity: isVacation
												? vacationConfig.opacity
												: (intensityStyleResult.opacity ?? 1),
											scale: 1,
										}}
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
