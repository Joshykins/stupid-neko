import type { CSSProperties, FC } from 'react';
import { useEffect, useState } from 'react';

// Local helper for safe class concatenation without external deps
function cx(...classes: Array<string | undefined | false>): string {
	return classes.filter(Boolean).join(' ');
}

// Configuration (editable)
export const CLOUD_SPAWN_AREA_VH = 75; // clouds spawn within the top X% of viewport height
export const CLOUD_TRAVEL_MARGIN_PX = 220; // offscreen margin for spawn/exit
export const CLOUD_COLOR = '#FFFFFF'; // base cloud color
export const CLOUD_OPACITY_RANGE: Readonly<[number, number]> = [0.1, 0.2];
export const CLOUD_FADE_DURATION_SEC_RANGE: Readonly<[number, number]> = [3, 6];
export const CLOUD_FADE_DELAY_SEC_RANGE: Readonly<[number, number]> = [0, 6];

// Unified cloud configuration (applies to all clouds)
export const CLOUD_SCALE_RANGE: Readonly<[number, number]> = [0.35, 6.0];
export const CLOUD_SPEED_SEC_RANGE: Readonly<[number, number]> = [160, 180];
export const CLOUD_COUNT_RANGE: Readonly<[number, number]> = [20, 30];
export const CLOUD_DELAY_SEC_RANGE: Readonly<[number, number]> = [0, 6];

// Cloud silhouette base size (matches the SCSS sample)
const CLOUD_BASE_WIDTH_PX = 162;
const CLOUD_BASE_HEIGHT_PX = 55;

type CloudInstance = {
	topVh: number;
	scale: number;
	speedSec: number;
	delaySec: number;
	opacity: number;
	fadeDurationSec: number;
	fadeDelaySec: number;
	zIndex: number;
};

function Cloud({
	topVh,
	scale,
	speedSec,
	delaySec,
	opacity,
	fadeDurationSec,
	fadeDelaySec,
	zIndex,
}: CloudInstance) {
	// Separate wrappers so animation translate and silhouette scale don't conflict
	const outerStyle: CSSProperties = {
		left: `${-(CLOUD_TRAVEL_MARGIN_PX + CLOUD_BASE_WIDTH_PX * scale)}px`,
		top: `${topVh}vh`,
		zIndex,
	};
	const fadeStyle: CSSProperties = {
		opacity: 0,
		willChange: 'opacity',
		animation: `cloud-fade-in ${fadeDurationSec}s ease-out ${fadeDelaySec}s forwards`,
	};
	const travelStyle: CSSProperties = {
		willChange: 'transform',
		animation: `cloud-travel ${speedSec}s linear ${delaySec}s infinite`,
		['--cloud-distance' as any]: `calc(100vw + ${2 * CLOUD_TRAVEL_MARGIN_PX}px + ${2 * CLOUD_BASE_WIDTH_PX * scale}px)`,
	};
	const cloudStyle: CSSProperties = {
		width: `${CLOUD_BASE_WIDTH_PX}px`,
		height: `${CLOUD_BASE_HEIGHT_PX}px`,
		transform: `scale(${scale})`,
		transformOrigin: 'top left',
		opacity,
	};

	const circleBase = 'absolute rounded-full';

	return (
		<div className="absolute" style={outerStyle}>
			<div style={fadeStyle}>
				<div style={travelStyle}>
					<div
						className={cx('relative overflow-hidden blur-xs')}
						style={cloudStyle}
					>
						{/* Circles composing the cloud silhouette (port from SCSS) */}
						<div
							className={cx(circleBase)}
							style={{
								width: 32,
								height: 32,
								left: 0,
								bottom: -15,
								background: CLOUD_COLOR,
							}}
						/>
						<div
							className={cx(circleBase)}
							style={{
								width: 35,
								height: 35,
								left: 20,
								bottom: 0,
								background: CLOUD_COLOR,
							}}
						/>
						<div
							className={cx(circleBase)}
							style={{
								width: 25,
								height: 25,
								left: 48,
								bottom: 15,
								background: CLOUD_COLOR,
							}}
						/>
						<div
							className={cx(circleBase)}
							style={{
								width: 35,
								height: 35,
								left: 65,
								bottom: 20,
								background: CLOUD_COLOR,
							}}
						/>
						<div
							className={cx(circleBase)}
							style={{
								width: 25,
								height: 25,
								left: 94,
								bottom: 16,
								background: CLOUD_COLOR,
							}}
						/>
						<div
							className={cx(circleBase)}
							style={{
								width: 30,
								height: 30,
								left: 110,
								bottom: -5,
								background: CLOUD_COLOR,
							}}
						/>
						<div
							className={cx(circleBase)}
							style={{
								width: 30,
								height: 30,
								left: 132,
								bottom: -15,
								background: CLOUD_COLOR,
							}}
						/>
						<div
							className={cx(circleBase)}
							style={{
								width: 90,
								height: 90,
								left: 30,
								bottom: -55,
								background: CLOUD_COLOR,
							}}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

export const BackgroundClouds: FC<{
	className?: string;
	enabled?: boolean;
}> = ({ className, enabled = true }) => {
	const [instances, setInstances] = useState<Array<CloudInstance>>([]);

	useEffect(() => {
		if (!enabled) return;
		const rand = (min: number, max: number) =>
			Math.random() * (max - min) + min;
		const randInt = (min: number, max: number) => Math.round(rand(min, max));

		const totalCount = randInt(
			CLOUD_COUNT_RANGE[0],
			CLOUD_COUNT_RANGE[1] + 0.49
		);

		const built: Array<CloudInstance> = [];
		const opacityThreshold =
			(CLOUD_OPACITY_RANGE[0] + CLOUD_OPACITY_RANGE[1]) / 2;

		for (let i = 0; i < totalCount; i += 1) {
			const speedSec = rand(CLOUD_SPEED_SEC_RANGE[0], CLOUD_SPEED_SEC_RANGE[1]);
			const baseDelay = rand(
				CLOUD_DELAY_SEC_RANGE[0],
				CLOUD_DELAY_SEC_RANGE[1]
			);
			const negativeOffset = -rand(0, speedSec); // start mid-flight
			const opacity = rand(CLOUD_OPACITY_RANGE[0], CLOUD_OPACITY_RANGE[1]);
			built.push({
				topVh: rand(0, CLOUD_SPAWN_AREA_VH),
				scale: rand(CLOUD_SCALE_RANGE[0], CLOUD_SCALE_RANGE[1]),
				speedSec,
				delaySec: baseDelay + negativeOffset,
				opacity,
				fadeDurationSec: rand(
					CLOUD_FADE_DURATION_SEC_RANGE[0],
					CLOUD_FADE_DURATION_SEC_RANGE[1]
				),
				fadeDelaySec: rand(
					CLOUD_FADE_DELAY_SEC_RANGE[0],
					CLOUD_FADE_DELAY_SEC_RANGE[1]
				),
				zIndex: opacity > opacityThreshold ? 2 : 0,
			});
		}

		// Optional: sort so small clouds appear behind big (lower z by render order)
		built.sort((a, b) => a.scale - b.scale);
		setInstances(built);
	}, [enabled]);

	if (!enabled || instances.length === 0) return null;

	return (
		<div
			className={cx(
				'absolute inset-x-0 top-0 pointer-events-none select-none',
				className
			)}
			style={{ height: `${CLOUD_SPAWN_AREA_VH}vh` }}
		>
			<style>{`
@keyframes cloud-travel {
  0% { transform: translateX(0); }
  100% { transform: translateX(var(--cloud-distance)); }
}
@keyframes cloud-fade-in {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
            `}</style>

			{instances.map((cfg, i) => (
				<Cloud key={`cloud-${i}`} {...cfg} />
			))}
		</div>
	);
};

export default BackgroundClouds;
