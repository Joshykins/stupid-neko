'use client';
import * as React from 'react';
import { Cell, Pie, PieChart } from 'recharts';
import { useCountUp } from '../../lib/useCountUp';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ChartContainer, ChartTooltip } from '../ui/chart';

export function DonutChartCard() {
	const chartConfig = {
		new: { label: 'New', color: 'var(--color-flashcards-new)' },
		learning: { label: 'Learning', color: 'var(--color-flashcards-learning)' },
		review: { label: 'Review', color: 'var(--color-flashcards-review)' },
		suspended: {
			label: 'Suspended',
			color: 'var(--color-flashcards-suspended)',
		},
	} as const;

	const data = React.useMemo(
		() => [
			{
				key: 'new',
				name: 'New',
				value: 48,
				fill: 'var(--color-flashcards-new)',
			},
			{
				key: 'learning',
				name: 'Learning',
				value: 22,
				fill: 'var(--color-flashcards-learning)',
			},
			{
				key: 'review',
				name: 'Review',
				value: 132,
				fill: 'var(--color-flashcards-review)',
			},
			{
				key: 'suspended',
				name: 'Suspended',
				value: 6,
				fill: 'var(--color-flashcards-suspended)',
			},
		],
		[]
	);
	const total = React.useMemo(
		() => data.reduce((sum, d) => sum + (Number(d.value) || 0), 0),
		[data]
	);
	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-display text-xl font-black">
					Flashcards breakdown
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex items-center gap-4">
					<div className="relative aspect-square w-40 h-40">
						<ChartContainer
							config={chartConfig}
							className="relative z-10 aspect-square w-full h-full"
						>
							<PieChart>
								<Pie
									data={data}
									dataKey="value"
									nameKey="name"
									innerRadius={48}
									outerRadius={72}
									stroke="var(--color-border)"
									strokeWidth={2}
								>
									{data.map((entry, index) => (
										<Cell key={`cell-${index}`} fill={entry.fill} />
									))}
								</Pie>
								<ChartTooltip
									cursor={false}
									// eslint-disable-next-line @typescript-eslint/no-explicit-any
									content={(props: any) => {
										const { active, payload } = props || {};
										if (!active || !payload?.length) return null;
										const item = payload[0];
										const key = item?.payload?.key as keyof typeof chartConfig;
										// eslint-disable-next-line @typescript-eslint/no-explicit-any
										const label =
											(chartConfig as any)[key]?.label || item?.name;
										const value = (item?.payload?.value ?? item?.value) as
											| number
											| undefined;
										const color = (item?.payload?.fill ?? item?.color) as
											| string
											| undefined;
										if (value === undefined) return null;
										return (
											<div className="relative z-20 border-border bg-foreground grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs border-2 border-border shadow-shadow">
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-2">
														<span
															className="inline-block w-3 h-3 rounded-sm border border-border"
															style={{ backgroundColor: color }}
														/>
														<span className="text-muted-foreground">
															{label}
														</span>
													</div>
													<span className="text-main-foreground font-mono font-medium tabular-nums">
														{Number(value).toLocaleString()}
													</span>
												</div>
											</div>
										);
									}}
								/>
							</PieChart>
						</ChartContainer>
						<div className="pointer-events-none absolute inset-0 grid place-items-center z-0">
							<div className="text-center leading-tight">
								<div className="font-display font-black text-2xl tabular-nums">
									<span ref={useCountUp(total)} />
								</div>
								<div className="text-xs font-bold text-muted-foreground">
									Flashcards
								</div>
							</div>
						</div>
					</div>
					<ul className="text-sm font-bold space-y-1">
						{data.map(d => (
							<li key={d.name} className="flex items-center gap-2">
								<span
									className="inline-block w-3 h-3 rounded-sm border-2 border-border"
									style={{ background: d.fill as React.CSSProperties['color'] }}
								/>
								{d.value} {d.name}
							</li>
						))}
					</ul>
				</div>
			</CardContent>
		</Card>
	);
}
