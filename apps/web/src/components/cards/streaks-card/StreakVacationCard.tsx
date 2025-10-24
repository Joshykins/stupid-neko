'use client';

import { useQuery } from 'convex/react';
import Image from 'next/image';
import * as React from 'react';
import { api } from '../../../../../../convex/_generated/api';
import { cn } from '../../../lib/utils';
import { Card } from '../../ui/card';
import { Progress } from '../../ui/progress';

type StreakVacationCardProps = {
	isLiveVersion?: boolean;
};

export const StreakVacationCard = ({
	isLiveVersion = false,
}: StreakVacationCardProps) => {
	const status = useQuery(
		api.userStreakFunctions.getVacationStatus,
		isLiveVersion ? {} : 'skip'
	);

	// Demo fallback when not live
	const demo = {
		balance: 2,
		percent: 65,
		autoHours: 24,
		cap: 7,
		capped: false,
	};

	const balance = isLiveVersion ? (status?.balance ?? 0) : demo.balance;
	const percent = isLiveVersion
		? (status?.percentTowardsNext ?? 0)
		: demo.percent;
	const _autoHours = isLiveVersion
		? (status?.autoApplyHours ?? 24)
		: demo.autoHours;
	const cap = isLiveVersion ? (status?.cap ?? 7) : demo.cap;
	const capped = isLiveVersion ? (status?.capped ?? false) : demo.capped;

	return (
		<Card className="p-4">
			<div className="flex items-center gap-4">
				{/* Icon badge */}
				<div className="flex justify-center">
					<div className="relative w-12 h-12 rounded-full overflow-hidden border-2 shadow-shadow">
						<Image
							src="/streak-vacation/streak-vacation-palm-tree.svg"
							alt="Streak vacation"
							fill
							className="object-cover"
						/>
					</div>
				</div>

				<div className="flex-1">
					{/* Count and label */}
					<div className="text-left flex items-end justify-start gap-1">
						<div className="font-display text-xl font-black">{balance}</div>
						<div className="font-display text-xl font-normal">
							/ {cap}{' '}
							<span className="font-display text-xl font-black">Vacations</span>
						</div>
					</div>

					{/* Info row */}
					<div className="flex items-center gap-2 text-main-foreground">
						<div className="text-sm text-muted-foreground">
							Used automatically if you miss a day.
						</div>
					</div>
				</div>
			</div>
			<div className="flex-1 pt-4">
				{/* Progress bar with label */}
				<div className="grid gap-2 relative">
					<Progress
						className="h-5 rounded-full bg-teal-100/50 border-border border-2"
						value={capped ? 100 : percent}
						indicatorColor="#90D8C9"
						showBubble
						bubble={
							<div className="relative w-5 h-5">
								<Image
									src="/streak-vacation/streak-vacation-beach-ball.svg"
									alt="Progress"
									fill
									className="object-contain"
								/>
							</div>
						}
					></Progress>
					<div
						className={cn(
							'text-right text-xs font-semibold text-main-foreground absolute top-0.5',
							capped || percent >= 70 ? 'left-2' : 'right-2'
						)}
					>
						{capped ? 'At cap' : `${percent}% to next`}
					</div>
				</div>
			</div>
		</Card>
	);
};
