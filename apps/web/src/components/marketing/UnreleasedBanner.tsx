'use client';
import { Moon } from 'lucide-react';
import { type CSSProperties, useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { Card } from '../ui/card';

const STAR_COUNT = 14;
const STAR_SIZE_RANGE = [3, 10];
const STAR_TWINKLE_DURATION_RANGE = [2000, 4000];

const Star = ({
	leftPercent,
	topPercent,
	size,
	twinkleDuration,
}: {
	leftPercent: number;
	topPercent: number;
	size: number;
	twinkleDuration: number;
}) => {
	const style = {
		left: `${leftPercent * 100}%`,
		top: `${topPercent * 100}%`,
		width: `${size}px`,
		height: `${size}px`,
		opacity: 0.9,
		['--twinkle-duration']: `${twinkleDuration}ms`,
	} as CSSProperties & { ['--twinkle-duration']?: string };

	return (
		<svg
			className={`absolute twinkle text-white/80 z-0`}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.8}
			strokeLinecap="round"
			strokeLinejoin="round"
			xmlns="http://www.w3.org/2000/svg"
			style={style}
		>
			<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
		</svg>
	);
};

export const UnreleasedBanner = ({ className }: { className?: string }) => {
	const MIN_DISTANCE = 0.12; // in normalized [0,1] units (~12% of banner width/height)
	const MAX_ATTEMPTS_PER_STAR = 50;

	const [stars, setStars] = useState<
		Array<{ x: number; y: number; size: number; twinkleMs: number }>
	>([]);

	useEffect(() => {
		const placed: Array<{ x: number; y: number }> = [];
		const generated: Array<{
			x: number;
			y: number;
			size: number;
			twinkleMs: number;
		}> = [];

		for (let i = 0; i < STAR_COUNT; i++) {
			let attempts = 0;
			let placedPoint: { x: number; y: number } | null = null;
			while (attempts < MAX_ATTEMPTS_PER_STAR && !placedPoint) {
				attempts++;
				const x = Math.random();
				const y = Math.random();
				let ok = true;
				for (const p of placed) {
					const dx = x - p.x;
					const dy = y - p.y;
					const dist = Math.hypot(dx, dy);
					if (dist < MIN_DISTANCE) {
						ok = false;
						break;
					}
				}
				if (ok) {
					placedPoint = { x, y };
					placed.push(placedPoint);
				}
			}
			// Fallback to random if no valid position found
			if (!placedPoint) {
				const x = Math.random();
				const y = Math.random();
				placedPoint = { x, y };
				placed.push(placedPoint);
			}

			const size =
				Math.random() * (STAR_SIZE_RANGE[1] - STAR_SIZE_RANGE[0]) +
				STAR_SIZE_RANGE[0];
			const twinkleMs =
				Math.random() *
					(STAR_TWINKLE_DURATION_RANGE[1] - STAR_TWINKLE_DURATION_RANGE[0]) +
				STAR_TWINKLE_DURATION_RANGE[0];
			generated.push({ x: placedPoint.x, y: placedPoint.y, size, twinkleMs });
		}

		setStars(generated);
	}, []);

	return (
		<Card
			className={cn(
				'bg-slate-900 border-main !shadow-[4px_4px_0px_0px_var(--main)] p-4 relative overflow-hidden',
				className
			)}
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			style={{ ['--card-bg' as any]: 'oklch(0.2441 0.0096 34.94)' }}
		>
			{stars.map((p, index) => (
				<Star
					key={index}
					leftPercent={p.x}
					topPercent={p.y}
					size={p.size}
					twinkleDuration={p.twinkleMs}
				/>
			))}
			<h2 className="text-orange-100 text-xl relative z-10">
				StupidNeko still in development. Pre-Release users only!
			</h2>
			<Moon className="opacity-50 size-16 text-orange-200 fill-orange-200 absolute rotate-260 top-2 right-2 z-0" />
			<p className="text-slate-500 text-xs relative z-10">
				Something is lurking in the shadows…
			</p>
		</Card>
	);
};
