"use client";
import { useQuery } from "convex/react";
import * as React from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { api } from "../../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "../ui/chart";

export function WeeklyBarsCard() {
	const formatMinutes = (mins: number) => {
		const m = Math.max(0, Math.round(mins));
		const h = Math.floor(m / 60);
		const r = m % 60;
		if (h > 0) return r > 0 ? `${h}h ${r}m` : `${h}h`;
		return `${r}m`;
	};

	const Tick = (props: any) => {
		const { x, y, payload } = props;
		return (
			<g transform={`translate(${x},${y})`}>
				<text
					dy={12}
					textAnchor="middle"
					style={{ fill: "var(--color-main-foreground)" }}
					className="font-bold"
				>
					{payload?.value}
				</text>
			</g>
		);
	};
	const chartConfig = {
		youtube: { label: "YouTube", color: "var(--color-source-youtube-soft)" },
		spotify: { label: "Spotify", color: "var(--color-source-spotify-soft)" },
		anki: { label: "Anki", color: "var(--color-source-anki-soft)" },
		misc: { label: "Misc", color: "var(--color-source-misc-soft)" },
	} as const;

	// Real data when authenticated, else fallback to demo
	const weekly = useQuery(
		api.userTargetLanguageActivityFunctions.getWeeklySourceDistribution,
		{},
	);
	const demoData = [
		{ day: "Mon", youtube: 60, spotify: 35, anki: 20, misc: 10 },
		{ day: "Tue", youtube: 40, spotify: 28, anki: 26, misc: 12 },
		{ day: "Wed", youtube: 30, spotify: 22, anki: 18, misc: 8 },
		{ day: "Thu", youtube: 55, spotify: 26, anki: 24, misc: 10 },
		{ day: "Fri", youtube: 42, spotify: 25, anki: 20, misc: 9 },
		{ day: "Sat", youtube: 24, spotify: 14, anki: 16, misc: 6 },
		{ day: "Sun", youtube: 36, spotify: 20, anki: 18, misc: 7 },
	];
	const data = React.useMemo(() => {
		if (weekly && weekly.length === 7) return weekly;
		return demoData;
	}, [weekly]);

	// Compute totals and prepare placeholder values for zero days
	const { prepared, maxTotal } = React.useMemo(() => {
		const withTotals = data.map((d) => {
			const total =
				(Number((d as any).youtube) || 0) +
				(Number((d as any).spotify) || 0) +
				(Number((d as any).anki) || 0) +
				(Number((d as any).misc) || 0);
			return { ...d, __total: total } as any;
		});
		const max = Math.max(0, ...withTotals.map((d: any) => d.__total));
		const placeholderHeight = max > 0 ? max : 60; // default height if all zero
		const out = withTotals.map((d: any) => ({
			...d,
			__placeholder: d.__total === 0 ? placeholderHeight : 0,
		}));
		return { prepared: out, maxTotal: placeholderHeight };
	}, [data]);

	const PlaceholderShape = React.useCallback((props: any) => {
		const { x, y, width, height, value } = props;
		if (!value || height <= 0) return null;
		return (
			<g pointerEvents="none">
				<rect
					x={x}
					y={y}
					width={width}
					height={height}
					rx={2}
					ry={2}
					fill="none"
					stroke="var(--color-border)"
					strokeDasharray="4 3"
					strokeWidth={2}
				/>
			</g>
		);
	}, []);
	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-display text-xl font-black">
					Weekly source distribution
				</CardTitle>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig}>
					<BarChart
						data={prepared}
						margin={{ top: 4, right: 8, left: 8, bottom: 16 }}
					>
						<XAxis
							dataKey="day"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							tick={<Tick />}
						/>
						<YAxis hide domain={[0, Math.max(1, maxTotal)]} />
						{/* Placeholder for zero days */}
						<Bar
							dataKey="youtube"
							stackId="a"
							fill="var(--color-source-youtube-soft)"
							radius={[2, 2, 0, 0]}
						/>
						<Bar
							dataKey="spotify"
							stackId="a"
							fill="var(--color-source-spotify-soft)"
							radius={[2, 2, 0, 0]}
						/>
						<Bar
							dataKey="anki"
							stackId="a"
							fill="var(--color-source-anki-soft)"
							radius={[2, 2, 0, 0]}
						/>
						<Bar
							dataKey="misc"
							stackId="a"
							fill="var(--color-source-misc-soft)"
							radius={[2, 2, 0, 0]}
						/>
						<ChartTooltip
							cursor={false}
							content={(props: any) => {
								const payload =
									props?.payload?.filter(
										(p: any) => p?.dataKey !== "__placeholder",
									) ?? [];
								return (
									<ChartTooltipContent
										{...props}
										payload={payload}
										labelKey="day"
										formatter={(
											value: number,
											name: string,
											item: any,
											index: number,
											payloadItem: any,
										) => {
											const label = (chartConfig as any)[name]?.label || name;
											const color = (payloadItem?.fill ??
												item?.payload?.fill ??
												item?.color) as string | undefined;
											return (
												<>
													<span
														className="inline-block w-3 h-3 rounded-sm border border-border mr-2 align-middle"
														style={{ backgroundColor: color }}
													/>
													<span className="text-muted-foreground mr-2">
														{label}
													</span>
													<span className="text-main-foreground font-mono font-medium tabular-nums">
														{formatMinutes(Number(value))}
													</span>
												</>
											);
										}}
									/>
								);
							}}
						/>
						<ChartLegend content={<ChartLegendContent />} />
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
