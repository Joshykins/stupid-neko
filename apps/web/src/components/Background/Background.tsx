'use client';
import {
	cubicBezier,
	motion,
	useReducedMotion,
	useScroll,
	useSpring,
	useTransform,
} from 'framer-motion';
import Image from 'next/image';
import BackgroundBirds from './BackgroundBirds';
import BackgroundClouds from './BackgroundClouds';
import { BackgroundSVGs } from './BackgroundSVGs';

// Subtle parallax background with a gentle initial slide-up on mount
export const Background = () => {
	const prefersReducedMotion = useReducedMotion();
	const { scrollY } = useScroll();

	// Map scroll position to a small upward translate for parallax (-24px at ~600px scroll)
	const rawY = useTransform(scrollY, [0, 600], [0, -24]);
	// Smooth the motion so it feels buttery, not jittery
	const parallaxY = useSpring(rawY, { stiffness: 60, damping: 18, mass: 0.4 });

	const initial = prefersReducedMotion
		? undefined
		: { scale: 1.12, opacity: 1 };
	const animate = prefersReducedMotion
		? undefined
		: { scale: 1.05, opacity: 1 };
	const transition = prefersReducedMotion
		? undefined
		: { duration: 6, ease: cubicBezier(0.22, 1, 0.36, 1) };

	return (
		<motion.div className="fixed inset-0 -z-1 pointer-events-none">
			{/* Inner wrapper handles both mount animation and scroll-based parallax */}
			<motion.div
				className="relative h-full w-full"
				style={{
					y: prefersReducedMotion ? 0 : parallaxY,
					willChange: 'transform',
				}}
				initial={initial}
				animate={animate}
				transition={transition}
			>
				<BackgroundClouds />
				<BackgroundBirds />
				<Image
					src="/background/mountain-bg-11.svg"
					alt="Decorative mountain background"
					fill
					priority
					style={{ objectFit: 'cover' }}
				/>
			</motion.div>
		</motion.div>
	);
};

export const BackgroundOld = () => {
	return (
		<div className="fixed inset-0 flex flex-col items-center -z-1 bg-mountain-tier-3">
			<div className="flex justify-center w-full bg-mountain-sky pt-[8vh]">
				<BackgroundSVGs
					type="bg-mountain-1"
					className="w-screen translate-y-[1.2vh] translate-x-[16vw] min-w-7xl max-w-[2000px]"
				/>
			</div>

			<div className="flex justify-center w-full bg-mountain-tier-1 pt-4">
				<BackgroundSVGs
					type="bg-mountain-2"
					className="w-screen  translate-y-[1.2vh] min-w-7xl max-w-[2000px]"
				/>
			</div>
			<div className="flex justify-center w-full bg-mountain-tier-2 pt-4">
				<BackgroundSVGs
					type="bg-mountain-3"
					className="w-screen translate-y-[1.2vh] min-w-7xl max-w-[2000px]"
				/>
			</div>
		</div>
	);
};
