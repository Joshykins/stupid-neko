'use client';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import type * as React from 'react';
import { cn } from '@/lib/utils';
import styles from './heatmap-progress.module.css';

type HeatmapProgressProps = React.ComponentProps<
	typeof ProgressPrimitive.Root
> & {
	value?: number; // 0-100
};

export function HeatmapProgress({
	className,
	value = 0,
	...props
}: HeatmapProgressProps) {
	const gradient = `linear-gradient(90deg,
        var(--color-heatmap-4) 0%,
        var(--color-heatmap-3) 25%,
        var(--color-heatmap-3) 50%,
        var(--color-heatmap-4) 75%,
        var(--color-heatmap-4) 100%
    )`;

	const is100Percent = value === 100;

	return (
		<div className={cn('relative scale-y-80 mx-0.75 mt-0.5', className)}>
			{is100Percent && (
				<div className="absolute overflow-hidden blur-sm -inset-1 rounded-lg">
					<div
						className={cn(
							'absolute inset-0 aspect-square -translate-y-[47%] scale-y-30 opacity-0',
							is100Percent && 'opacity-100',
							styles.heatmapSpin
						)}
						style={{
							backgroundImage: `linear-gradient(90deg,
                        var(--color-heatmap-4) 0%,
                        var(--color-heatmap-3) 25%,
                        var(--color-heatmap-2) 50%,
                        var(--color-heatmap-3) 75%,
                        var(--color-heatmap-4) 100%
                    )`,
						}}
					></div>
				</div>
			)}

			<div
				className={cn('absolute overflow-hidden -inset-[2.5px] rounded-full')}
			>
				<div
					className={cn(
						'absolute inset-0 aspect-square -translate-y-[47%] scale-y-30',
						is100Percent && 'bg-transparent',
						(is100Percent && styles.heatmapSpin) || ''
					)}
					style={
						!is100Percent
							? { backgroundColor: 'var(--color-heatmap-bg)' }
							: {
									backgroundImage: `linear-gradient(90deg,
                        var(--color-heatmap-4) 0%,
                        var(--color-heatmap-3) 25%,
                        var(--color-heatmap-2) 50%,
                        var(--color-heatmap-3) 75%,
                        var(--color-heatmap-4) 100%
                    )`,
								}
					}
				></div>
			</div>

			<ProgressPrimitive.Root
				data-slot="progress blur"
				className={cn(
					'relative h-2 z-[2] w-full overflow-hidden rounded-base bg-[var(--color-heatmap-bg)]'
				)}
				{...props}
			>
				<ProgressPrimitive.Indicator
					data-slot="progress-indicator"
					className={cn(
						'h-full relative w-full flex-1 border-r-2 border-[var(--color-heatmap-4)] transition-transform duration-700 ease-out'
					)}
					style={{
						transform: `translateX(-${100 - (value || 0)}%)`,
						backgroundImage: gradient,
					}}
				></ProgressPrimitive.Indicator>
			</ProgressPrimitive.Root>
		</div>
	);
}

export default HeatmapProgress;
