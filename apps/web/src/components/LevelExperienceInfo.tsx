'use client';

import { Info } from 'lucide-react';
import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { xpForNextLevel } from '../../../../lib/levelAndExperienceCalculations/levelAndExperienceCalculator';
import { Button } from './ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

type BucketPoint = {
	bucketIndex: number;
	rangeStart: number;
	rangeEnd: number;
	minDeltaXp: number;
	maxDeltaXp: number;
	avgDeltaXp: number;
	isFlatTail?: boolean;
};

function detectCostCutoff(maxScanLevel: number = 200): number {
	// Returns the level after which xpForNextLevel stops increasing.
	let previous = xpForNextLevel(1);
	for (let lvl = 2; lvl <= maxScanLevel; lvl++) {
		const current = xpForNextLevel(lvl);
		if (current === previous) {
			return lvl - 1;
		}
		previous = current;
	}
	return maxScanLevel;
}

function bucketizeLevels(
	bucketSize: number,
	uptoLevel: number
): Array<BucketPoint> {
	const buckets: Array<BucketPoint> = [];
	let bucketIndex = 1;
	for (let start = 1; start <= uptoLevel; start += bucketSize) {
		const end = Math.min(start + bucketSize - 1, uptoLevel);
		let minDelta = Number.POSITIVE_INFINITY;
		let maxDelta = 0;
		let sum = 0;
		let count = 0;
		for (let lvl = start; lvl <= end; lvl++) {
			const d = xpForNextLevel(lvl);
			minDelta = Math.min(minDelta, d);
			maxDelta = Math.max(maxDelta, d);
			sum += d;
			count++;
		}
		const avg = count > 0 ? sum / count : 0;
		buckets.push({
			bucketIndex,
			rangeStart: start,
			rangeEnd: end,
			minDeltaXp: minDelta === Number.POSITIVE_INFINITY ? 0 : minDelta,
			maxDeltaXp: maxDelta,
			avgDeltaXp: avg,
		});
		bucketIndex++;
	}
	return buckets;
}

export default function LevelExperienceInfo({
	maxLevel = 60,
}: {
	maxLevel?: number;
}) {
	// Determine the cutoff where per-level XP cost flattens
	const cutoffLevel = React.useMemo(
		() => detectCostCutoff(Math.max(120, maxLevel)),
		[maxLevel]
	);
	// Bucket into ranges of 10 levels by default
	const bucketSize = 10;
	const bucketedData = React.useMemo(
		() => bucketizeLevels(bucketSize, Math.min(maxLevel, cutoffLevel)),
		[maxLevel, cutoffLevel]
	);
	const flatCostAfterCutoff = React.useMemo(
		() => xpForNextLevel(cutoffLevel),
		[cutoffLevel]
	);
	const dataWithTail = React.useMemo(() => {
		const base = bucketedData;
		// Append one flat tail bucket to illustrate the plateau beyond cutoff
		const tail: BucketPoint = {
			bucketIndex: base.length + 1,
			rangeStart: cutoffLevel + 1,
			rangeEnd: cutoffLevel + bucketSize,
			minDeltaXp: flatCostAfterCutoff,
			maxDeltaXp: flatCostAfterCutoff,
			avgDeltaXp: flatCostAfterCutoff,
			isFlatTail: true,
		};
		return [...base, tail];
	}, [bucketedData, cutoffLevel, flatCostAfterCutoff]);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					size="icon"
					variant={'neutral'}
					className="h-7 w-7 p-0 flex items-center justify-center"
					aria-label="Level/XP info"
				>
					<Info className="stroke-3 text-background !size-5" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-96 p-3 bg-secondary-background">
				<div className="mb-2">
					<div className="font-semibold leading-none text-background">
						Level & Experience Curve
					</div>
					<div className="text-xs text-background mt-1">
						Each level requires more XP until level {cutoffLevel}. After that,
						each level costs {flatCostAfterCutoff.toLocaleString()} XP.
					</div>
				</div>
				<div className="pr-2">
					<ChartContainer
						config={{
							cost: {
								label: 'XP to Next Level',
								color: 'var(--color-experience)',
							},
						}}
						className="aspect-[4/3] rounded-base border-2 border-border px-2 pt-2"
					>
						<AreaChart
							className="!text-background"
							data={dataWithTail}
							margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
						>
							<CartesianGrid strokeDasharray="3 3" />
							<XAxis
								className="!fill-background"
								dataKey={(d: BucketPoint) =>
									d.isFlatTail
										? `${cutoffLevel}+`
										: `${d.rangeStart}-${d.rangeEnd}`
								}
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								fill="var(--color-background)"
							/>
							<YAxis
								className="!fill-background"
								tickLine={false}
								axisLine={false}
								width={40}
								tickFormatter={v =>
									typeof v === 'number' ? v.toLocaleString() : String(v)
								}
							/>
							<ChartTooltip
								content={(props: {
									active?: boolean;
									payload?: Array<{ payload: BucketPoint }>;
									label?: string | number;
								}) => (
									<ChartTooltipContent
										{...props}
										labelFormatter={() => ''}
										formatter={(
											_value: number,
											_name: string,
											_item: { payload: BucketPoint },
											_index: number,
											payload: BucketPoint
										) => {
											return (
												<div className="flex w-full flex-col gap-0.5">
													<div className="font-medium">
														{payload.isFlatTail
															? `Levels ${cutoffLevel}+`
															: `Levels ${payload.rangeStart}-${payload.rangeEnd}`}
													</div>
													<div className="text-muted-foreground">
														Avg cost:{' '}
														{Math.round(payload.avgDeltaXp).toLocaleString()}
													</div>
													<div className="text-muted-foreground">
														Range:{' '}
														{Math.round(payload.minDeltaXp).toLocaleString()} –{' '}
														{Math.round(payload.maxDeltaXp).toLocaleString()}
													</div>
												</div>
											);
										}}
									/>
								)}
							/>
							<Area
								type="monotone"
								dataKey="avgDeltaXp"
								name="cost"
								fill="var(--color-cost)"
								stroke="var(--color-cost)"
							/>
						</AreaChart>
					</ChartContainer>
					<div className="text-xs text-background mt-2">
						100xp roughly equalts 1 hour of study. With streak bonus it equals
						30 minutes. Leagues, quests, and more also award XP.
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
