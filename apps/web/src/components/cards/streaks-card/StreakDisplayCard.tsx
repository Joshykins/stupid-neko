"use client";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { RotateCw } from "lucide-react";
import * as React from "react";
import { api } from "../../../../../../convex/_generated/api";
import { calculateStreakBonusPercent } from "../../../../../../lib/streakBonus";
import { useCountUp } from "../../../lib/useCountUp";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import HeatmapProgress from "../../ui/heatmap-progress";
import StreakDisplayGrid from "./StreakDisplayGrid";
import StreakDisplayWeek from "./StreakDisplayWeek";

type Props = {
	title?: string;
	days?: number;
	values?: Array<number>;
	cellSize?: number;
	liveVersion?: boolean;
};

const HEATMAP_INTENSITY_STEPS = 5;

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

export default function StreakDisplayCard({
	title = "Daily Streak",
	days = 365,
	values,
	cellSize = 12,
	liveVersion = false,
}: Props) {
	const streakData = useQuery(
		api.userStreakFunctions.getStreakDataForHeatmap,
		liveVersion ? { days } : "skip",
	);
	const me = useQuery(api.userFunctions.me, liveVersion ? {} : "skip");
	const updateMode = useMutation(api.userFunctions.updateStreakDisplayCardMode);

	// Generate rich mock data for marketing (non-live) view
	const mock = React.useMemo(() => {
		if (liveVersion) return null as any;
		const total = days;
		const seed = hashStringToSeed(`${title}-${days}-mock-v2`);
		const rng = createSeededRng(seed);

		// Base intensities biased toward higher tiers
		const vals: number[] = new Array(total).fill(0);
		for (let i = 0; i < total; i++) {
			const r = rng();
			if (r < 0.02)
				vals[i] = 0; // very rare zeros
			else if (r < 0.07) vals[i] = 1;
			else if (r < 0.2) vals[i] = 2;
			else if (r < 0.45) vals[i] = 3;
			else vals[i] = 4; // majority high intensity
		}

		// Choose a strong current streak length
		const minStreak = Math.max(14, Math.floor(days * 0.15));
		const maxStreak = Math.max(minStreak + 10, Math.floor(days * 0.35));
		const targetStreak = Math.min(
			total,
			Math.floor(minStreak + rng() * (maxStreak - minStreak + 1)),
		);

		// Ensure trailing streak days are credited (intensity > 0 or vacation)
		for (let i = total - targetStreak; i < total; i++) {
			if (i >= 0) vals[i] = Math.max(vals[i], 1);
		}

		// Vacation groups: 2-5 groups, sizes 1-4, fairly rare and non-overlapping
		const vacationFlags: boolean[] = new Array(total).fill(false);
		const groupCount = 2 + Math.floor(rng() * 4); // 2..5
		const used = new Set<number>();
		function canPlace(start: number, len: number): boolean {
			for (let i = 0; i < len; i++) if (used.has(start + i)) return false;
			return start >= 0 && start + len <= total;
		}
		let placed = 0;
		let guard = 0;
		while (placed < groupCount && guard < 200) {
			guard++;
			const len = 1 + Math.floor(rng() * 4); // 1..4
			const biasRecent = rng() < 0.6; // bias into recent third sometimes
			const startMin = biasRecent ? Math.floor(total * 0.6) : 0;
			const startMax = total - len;
			const start =
				startMin + Math.floor(rng() * Math.max(1, startMax - startMin + 1));
			if (!canPlace(start, len)) continue;
			// Avoid stacking too dense: ensure at least 2 days gap from other vacations
			let ok = true;
			for (let i = start - 2; i < start + len + 2; i++) {
				if (i >= 0 && i < total && used.has(i)) {
					ok = false;
					break;
				}
			}
			if (!ok) continue;
			for (let i = 0; i < len; i++) {
				vacationFlags[start + i] = true;
				used.add(start + i);
				// vacation days have no minutes/intensity color overridden to green; keep intensity low so green stands out
				vals[start + i] = 0;
			}
			placed++;
		}

		// Minutes learned per day mapped from intensity, vacations have 0
		const minutes: number[] = new Array(total).fill(0);
		for (let i = 0; i < total; i++) {
			if (vacationFlags[i]) {
				minutes[i] = 0;
				continue;
			}
			const v = vals[i];
			let base = 0;
			if (v === 0) base = rng() < 0.5 ? 0 : 10;
			else if (v === 1) base = 25 + Math.floor(rng() * 10);
			else if (v === 2) base = 40 + Math.floor(rng() * 15);
			else if (v === 3) base = 60 + Math.floor(rng() * 20);
			else base = 85 + Math.floor(rng() * 30);
			minutes[i] = base;
		}

		// Compute current streak counting vacations as credited
		let currentStreak = 0;
		for (let i = total - 1; i >= 0; i--) {
			const credited = minutes[i] > 0 || vacationFlags[i];
			if (credited) currentStreak++;
			else break;
		}
		// If below target due to placement randomness, force it
		if (currentStreak < targetStreak) {
			const need = targetStreak - currentStreak;
			for (
				let i = total - currentStreak - 1;
				i >= total - currentStreak - need && i >= 0;
				i--
			) {
				if (vacationFlags[i]) continue;
				minutes[i] = Math.max(minutes[i], 30);
				vals[i] = Math.max(vals[i], 2);
			}
			currentStreak = targetStreak;
		}

		return {
			values: values && values.length === total ? values : vals,
			activityCounts: minutes,
			vacationFlags,
			currentStreak,
			totalDays: total,
		};
	}, [liveVersion, days, title, values]);

	const startDate = React.useMemo(() => {
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		d.setDate(
			d.getDate() - ((streakData?.totalDays ?? mock?.totalDays ?? days) - 1),
		);
		return d;
	}, [streakData?.totalDays, mock?.totalDays, days]);

	const [mode, setMode] = React.useState<"grid" | "week">("grid");
	React.useEffect(() => {
		if (!liveVersion) return;
		const stored = me?.streakDisplayMode;
		if (stored === "grid" || stored === "week") setMode(stored);
	}, [me?.streakDisplayMode, liveVersion]);

	const saveMode = React.useCallback(
		async (next: "grid" | "week") => {
			setMode(next);
			if (!liveVersion) return;
			if (!me) return;
			try {
				await updateMode({ mode: next });
			} catch {}
		},
		[updateMode, liveVersion, me],
	);

	const intensityStyle = (n: number): React.CSSProperties => {
		const colors = [
			"var(--color-heatmap-bg)",
			"var(--color-heatmap-0)",
			"var(--color-heatmap-1)",
			"var(--color-heatmap-2)",
			"var(--color-heatmap-3)",
			"var(--color-heatmap-4)",
		];
		return {
			backgroundColor:
				colors[Math.max(0, Math.min(HEATMAP_INTENSITY_STEPS - 1, n))],
		};
	};

	const [tooltip, setTooltip] = React.useState<{
		visible: boolean;
		x: number;
		y: number;
		label: string;
	}>({ visible: false, x: 0, y: 0, label: "" });
	const tooltipRef = React.useRef<HTMLDivElement | null>(null);
	const [tooltipSize, setTooltipSize] = React.useState<{
		w: number;
		h: number;
	}>({ w: 0, h: 0 });
	const containerRef = React.useRef<HTMLDivElement | null>(null);
	const [containerWidth, setContainerWidth] = React.useState<number>(0);
	const [containerHeight, setContainerHeight] = React.useState<number>(0);
	React.useEffect(() => {
		if (!containerRef.current) return;
		const el = containerRef.current;
		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) {
				setContainerWidth(entry.contentRect.width);
				setContainerHeight(entry.contentRect.height);
			}
		});
		ro.observe(el);
		const rect = el.getBoundingClientRect();
		setContainerWidth(rect.width);
		setContainerHeight(rect.height);
		return () => ro.disconnect();
	}, []);
	React.useLayoutEffect(() => {
		if (tooltipRef.current)
			setTooltipSize({
				w: tooltipRef.current.offsetWidth,
				h: tooltipRef.current.offsetHeight,
			});
	}, [tooltip.visible, tooltip.label]);

	const totalDaysEffective = streakData?.totalDays ?? mock?.totalDays ?? days;
	const activityCounts = (streakData?.activityCounts ?? mock?.activityCounts) as
		| number[]
		| undefined;
	const vacationFlags = (streakData?.vacationFlags ?? mock?.vacationFlags) as
		| boolean[]
		| undefined;

	const onHover = (absoluteIndex: number, value: number) => {
		if (absoluteIndex >= totalDaysEffective) return;
		const day = new Date(startDate);
		day.setDate(day.getDate() + absoluteIndex);
		const dateLabel = day.toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
		});

		const minutesLearned =
			activityCounts && activityCounts.length === totalDaysEffective
				? Math.max(0, Math.floor(activityCounts[absoluteIndex] ?? 0))
				: 0;
		const hours = Math.max(0, Math.floor(minutesLearned / 60));
		const mins = Math.max(0, Math.floor(minutesLearned % 60));
		const timePart =
			minutesLearned > 0
				? ` • ${hours}:${mins.toString().padStart(2, "0")}`
				: "";

		const isVacation = Boolean(
			vacationFlags &&
				vacationFlags.length === totalDaysEffective &&
				vacationFlags[absoluteIndex],
		);
		const vacationSuffix = isVacation ? " • Vacation" : "";

		const label = `${dateLabel}${timePart}${vacationSuffix}`;
		setTooltip((t) => ({ ...t, visible: true, label }));
	};
	const onMove = (ev: React.MouseEvent<HTMLDivElement>) => {
		const rect = containerRef.current?.getBoundingClientRect();
		if (!rect) return;
		setTooltip((t) =>
			t.visible
				? {
						...t,
						x: ev.clientX - rect.left + 12,
						y: ev.clientY - rect.top + 12,
					}
				: t,
		);
	};
	const onLeave = () => setTooltip({ visible: false, x: 0, y: 0, label: "" });

	// Use real or mock current streak and bonus percent
	const currentStreak = liveVersion
		? (streakData?.currentStreak ?? 0)
		: (mock?.currentStreak ?? 0);
	const streakBonusPercent = calculateStreakBonusPercent(currentStreak);

	const titleCountUpRef = useCountUp(currentStreak);
	const bonusCountUpRef = useCountUp(streakBonusPercent);

	// Choose values/minutes/flags to render
	const effectiveValues = liveVersion
		? streakData && streakData.values.length === (days ?? 0)
			? streakData.values
			: values
		: (mock?.values ?? values);

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="font-display text-lg font-black tracking-tight text-main-foreground flex justify-between items-center gap-2">
					<div className="flex items-center gap-2">
						{title}
						<span className="inline-flex items-center gap-1 text-lg font-black">
							<svg width="16" height="18" viewBox="0 0 16 18" aria-hidden>
								<path
									d="M8 1 C10 4 5 6 8 9 C10 11 12 9 12 7 C14 9 15 11 15 13 C15 15.761 12.761 18 10 18 H6 C3.239 18 1 15.761 1 13 C1 9 4 6 6 4 C6.5 3.5 7.5 2.5 8 1 Z"
									fill="#F59E0B"
									stroke="#000"
									strokeWidth="2"
								/>
							</svg>
							<span ref={titleCountUpRef} />
						</span>
					</div>
					<div className="flex items-center gap-2">
						<Badge className="bg-[var(--color-heatmap-1)]">
							<div className="inline-flex items-center font-bold text-base text-main-foreground">
								<span ref={bonusCountUpRef} />% XP Bonus
							</div>
						</Badge>
						<Button
							size="icon"
							variant="neutral"
							className="h-7 w-7 p-0 flex items-center justify-center"
							onClick={() => saveMode(mode === "grid" ? "week" : "grid")}
							aria-label="Swap streak view"
							title="Swap streak view"
						>
							<RotateCw className="stroke-3 text-background !size-5" />
						</Button>
					</div>
				</CardTitle>
				<HeatmapProgress value={streakBonusPercent} />
			</CardHeader>
			<CardContent className="px-4">
				<div
					ref={containerRef}
					className={`w-full rounded-md overflow-hidden border-2 border-black ${mode === "grid" ? "bg-heatmap-bg" : "bg-foreground"} relative`}
					onMouseMove={onMove}
					onMouseLeave={onLeave}
				>
					<AnimatePresence mode="wait">
						{mode === "grid" && (
							<motion.div
								key="grid"
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -8 }}
								transition={{ duration: 0.25 }}
							>
								<StreakDisplayGrid
									title={title}
									days={days}
									values={effectiveValues}
									cellSize={cellSize}
									onHover={onHover}
									intensityStyle={intensityStyle}
									startDate={startDate}
									liveVersion={liveVersion}
									activityCounts={activityCounts}
									vacationFlags={vacationFlags}
								/>
							</motion.div>
						)}
						{mode === "week" && (
							<motion.div
								key="week"
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -8 }}
								transition={{ duration: 0.25 }}
							>
								<StreakDisplayWeek
									title={title}
									days={days}
									values={effectiveValues}
									onHover={onHover}
									intensityStyle={intensityStyle}
									totalDays={totalDaysEffective}
									liveVersion={liveVersion}
									activityCounts={activityCounts}
									vacationFlags={vacationFlags}
								/>
							</motion.div>
						)}
					</AnimatePresence>

					{tooltip.visible && (
						<div
							ref={tooltipRef}
							className="pointer-events-none absolute z-20 inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs border-2 border-border shadow-shadow bg-foreground"
							style={{
								left: Math.max(
									8,
									Math.min(
										tooltip.x,
										Math.max(8, containerWidth - tooltipSize.w - 8),
									),
								),
								top: Math.max(
									8,
									Math.min(
										tooltip.y,
										Math.max(8, containerHeight - tooltipSize.h - 8),
									),
								),
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
