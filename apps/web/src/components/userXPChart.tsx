'use client';

import { useQuery } from 'convex/react';
import { Rocket } from 'lucide-react';
import * as React from 'react';
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { api } from '../../../../convex/_generated/api';
import { useCountUp } from '../lib/useCountUp';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';

type Range = '7d' | '30d' | 'all';

function formatDay(ms: number): string {
	const d = new Date(ms);
	return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

type XpAreaChartProps = {
	isLiveVersion?: boolean;
};

function createSeededRng(seedInput: number): () => number {
	let seed = seedInput % 2147483647;
	if (seed <= 0) seed += 2147483646;
	return () => {
		seed = (seed * 16807) % 2147483647;
		return seed / 2147483647;
	};
}

const demoPoints = (days: number): Array<{ name: string; xp: number }> => {
	const now = Date.now();
	const DAY = 24 * 60 * 60 * 1000;
	const rng = createSeededRng(days * 137 + 42);
	const pts: Array<{ name: string; xp: number }> = [];
	// Weekly rhythm multipliers (Mon..Sun) emphasizing weekend dips and Fri peak
	const weeklyMultiplier = [1.0, 1.1, 1.05, 1.0, 1.2, 1.15, 0.6];
	// Slow trend to simulate momentum (up then mild down)
	for (let i = days - 1; i >= 0; i--) {
		const t = now - i * DAY;
		const dayOfWeek = new Date(t).getDay(); // 0 Sun .. 6 Sat
		const weekIdx = Math.floor((days - 1 - i) / 7);
		const trend = 0.9 + Math.min(0.25, weekIdx * 0.05); // gradual improvement
		const baseMinutes = 35 + Math.floor(rng() * 35); // 35-70 minutes baseline
		const bonus = (dayOfWeek === 4 ? 20 : 0) + (dayOfWeek === 1 ? 10 : 0); // Fri push, Mon restart
		const restDrop = dayOfWeek === 0 ? -25 : 0; // Sunday lighter
		const minutes = Math.max(
			0,
			Math.round(
				(baseMinutes + bonus + restDrop) *
					weeklyMultiplier[(dayOfWeek + 6) % 7] *
					trend
			)
		);
		const xp = Math.round(minutes * (100 / 60)); // ~100 XP per hour baseline
		pts.push({ name: formatDay(t), xp });
	}
	return pts;
};

export default function UserXPChart({
	isLiveVersion = false,
}: XpAreaChartProps) {
	const [range, setRange] = React.useState<Range>('7d');
	const data = useQuery(
		api.userXPChartFunctions.getXpTimeseries,
		isLiveVersion ? ({ range } as { range: Range }) : 'skip'
	);
	const gradientRawId = React.useId();
	const gradientId = React.useMemo(
		() => `xpGradient_${gradientRawId.replace(/:/g, '')}`,
		[gradientRawId]
	);

	// Build chart-friendly data
	const chartData = React.useMemo(() => {
		if (!isLiveVersion) {
			const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
			return demoPoints(days);
		}
		if (!data) return [];
		return data.points.map(p => ({
			name: formatDay(p.dayStartMs),
			xp: p.xp,
		}));
	}, [data, isLiveVersion, range]);

	const total = React.useMemo(() => {
		if (!isLiveVersion) return chartData.reduce((s, p) => s + p.xp, 0);
		if (!data) return 0;
		return data.totalXp ?? 0;
	}, [chartData, data, isLiveVersion]);

	// High-contrast color for visibility (matches neobrutalist palette)
	const stroke = 'var(--color-level)';

	const xpCountUpRef = useCountUp(total);
	return (
		<Card>
			<CardHeader className="flex items-start justify-between pb-4">
				<CardTitle className="font-display text-xl font-black flex flex-col gap-2">
					Experience Trend
					<Badge className="bg-experience">
						<Rocket /> <span ref={xpCountUpRef} /> Total XP
					</Badge>
				</CardTitle>
				<div className="inline-flex gap-2">
					{(['7d', '30d', 'all'] as Range[]).map(r => (
						<Button
							key={r}
							size="sm"
							type="button"
							variant={range === r ? 'default' : 'ghost'}
							onClick={() => setRange(r)}
						>
							{r}
						</Button>
					))}
				</div>
			</CardHeader>
			<CardContent>
				<ChartContainer
					config={{ xp: { label: 'XP', color: stroke } }}
					className="aspect-[4/3] rounded-base border-2 border-border px-2 pt-2 bg-secondary-background"
				>
					<AreaChart
						data={chartData}
						margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
						className="!text-background"
					>
						<CartesianGrid strokeDasharray="3 3" />
						<XAxis
							className="!fill-background"
							dataKey="name"
							tickLine={false}
							axisLine={false}
							minTickGap={24}
						/>
						<YAxis
							className="!fill-background"
							tickLine={false}
							axisLine={false}
							width={40}
						/>
						<ChartTooltip
							content={
								((props: any) => (
									<ChartTooltipContent
										{...props}
										labelFormatter={(value: any) => String(value)}
										formatter={(v: number) => [
											`${Number(v).toLocaleString()} XP`,
											'',
										]}
									/>
								)) as any
							}
						/>
						<Area
							type="monotone"
							dataKey="xp"
							name="xp"
							fill={stroke}
							stroke={stroke}
							fillOpacity={0.25}
							strokeWidth={2}
						/>
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
