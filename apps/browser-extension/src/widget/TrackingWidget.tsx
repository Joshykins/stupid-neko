import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LanguageCode } from '../../../../convex/schema';
import { calculateStreakBonusPercent } from '../../../../lib/streakBonus';
import { useAuth } from '../components/hooks/useAuth';
import { LanguageFlagSVG } from '../components/LanguageFlagSVG';
import HeatmapProgress from '../components/ui/heatmap-progress';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '../components/ui/popover';
import { Button } from '../components/ui/button';
import {
	useWidgetState,
	useUserInfo,
	useWidgetActions,
	useWidgetPosition,
} from './hooks';

type TrackingWidgetProps = {
	userName?: string;
	languageCode?: LanguageCode; // ISO like "ja"
	collapsedByDefault?: boolean;
};

export default function TrackingWidget(props: TrackingWidgetProps) {
	const { collapsedByDefault = true } = props;
	const [expanded, setExpanded] = useState(!collapsedByDefault);
	const [hovered, setHovered] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const containerRef = useRef<HTMLDivElement | null>(null);

	// Use custom hooks for state management
	const widgetState = useWidgetState();
	const userInfo = useUserInfo(props);
	const { sendConsentResponse, stopRecording, retry } = useWidgetActions();
	const {
		mvLeft,
		mvTop,
		controls,
		dragMovedRef,
		onDragStart,
		onDrag,
		onDragEnd,
	} = useWidgetPosition();

	const [iconUrl, setIconUrl] = useState<string>('');
	const [currentTime, setCurrentTime] = useState(Date.now());

	useEffect(() => {
		try {
			setIconUrl(chrome.runtime.getURL('icon-128.png'));
		} catch {
			setIconUrl('/icon-128.png');
		}
	}, []);

	// Update timer every second when tracking
	useEffect(() => {
		if (widgetState.state === 'default-tracking' && widgetState.startTime) {
			const interval = setInterval(() => {
				setCurrentTime(Date.now());
			}, 1000);
			return () => clearInterval(interval);
		}
	}, [widgetState.state, widgetState.startTime]);

	// Auto-expand/collapse based on widget state
	useEffect(() => {
		const shouldCollapse = widgetState.state === 'idle';
		setExpanded(!shouldCollapse);
	}, [widgetState.state]);

	const contentLabel: string = useMemo(() => {
		try {
			const raw = localStorage.getItem('lastContentLabel');
			if (raw) {
				const parsed = JSON.parse(raw);
				if (typeof parsed?.title === 'string' && parsed.title.trim().length > 0)
					return parsed.title.trim();
			}
		} catch {}
		try {
			const title = document.title.replace(/ - YouTube$/, '').trim();
			if (title) return title;
		} catch {}
		return 'this content';
	}, []);

	// Auth/me state from background
	const { me } = useAuth();

	// Rotating encouragement lines (stupid neko themed)
	const encouragement: string = useMemo(() => {
		const lines: Array<string> = [
			'Keep up the good work',
			'Stupid Neko approves this grind.',
			'Nyaa~ your brain is leveling up.',
			'Meowtstanding progress!',
			'Learn now, nap later.',
			'One more minute, one more whisker.',
			'Claw your way to fluency.',
			'Big Neko energy.',
			'No nap until +1 XP.',
		];
		try {
			const idx = Math.floor(Math.random() * lines.length);
			return lines[idx];
		} catch {
			return lines[0];
		}
	}, []);

	// Mock stats for now
	const nekos = 1426;
	const hours = 1034;
	const experienceMillions = 1.34;
	const dailyStreak = 0; // TODO: Get from proper user data source

	const streakPercent = calculateStreakBonusPercent(dailyStreak);
	const xpBonusPercent = streakPercent;
	const progressPercent = streakPercent;

	// Enhanced drag handlers with popover management
	const handleDrag = (
		_e: unknown,
		info: { offset: { x: number; y: number } }
	) => {
		const dx = Math.abs(info?.offset?.x || 0);
		const dy = Math.abs(info?.offset?.y || 0);
		if (dx > 2 || dy > 2) {
			setIsDragging(true);
			// Close popover
			setExpanded(false);
		}
		onDrag(_e, info);
	};

	const handleDragEnd = async (
		_e: unknown,
		info: { offset: { x: number; y: number } }
	) => {
		setIsDragging(false);
		await onDragEnd(_e, info);
	};

	// Render content based on widget state
	const renderStateBasedContent = () => {
		if (!widgetState) {
			// Default content when no state is provided
			return (
				<>
					<div className="snbex:mt-3 snbex:text-2xl snbex:font-bold snbex:leading-snug">
						Hey{' '}
						<span className="snbex:font-black">
							{me?.name || userInfo.userName}
						</span>
						!{' '}
						<span className="snbex:opacity-80 snbex:font-semibold">
							{encouragement}
						</span>
					</div>

					<div className="snbex:mt-4">
						<div className="snbex:flex snbex:items-center snbex:gap-2 snbex:text-sm snbex:font-medium">
							<span>Daily Streak</span>
							<span className="snbex:inline-flex snbex:items-center snbex:gap-1 snbex:font-bold">
								<span role="img" aria-label="fire">
									🔥
								</span>
								<span className="snbex:font-black">{dailyStreak}</span>
							</span>
							<span className="snbex:ml-auto snbex:rounded-full snbex:border-2 snbex:border-black snbex:bg-white snbex:px-2 snbex:py-1 snbex:text-xs snbex:font-bold">
								<span className="snbex:font-black">{xpBonusPercent}%</span> XP
								Bonus
							</span>
						</div>
						<div className="snbex:mt-2">
							<HeatmapProgress value={progressPercent} />
						</div>
					</div>

					<div className="snbex:mt-4 snbex:text-sm snbex:leading-relaxed">
						<span className="snbex:font-black">{nekos.toLocaleString()}</span>{' '}
						nekos watched{' '}
						<span className="snbex:font-semibold snbex:italic">
							{contentLabel}
						</span>{' '}
						to learn <span className="snbex:font-black">Japanese</span>!
						Totaling{' '}
						<span className="snbex:font-black">{hours.toLocaleString()}</span>{' '}
						tracked hours. And{' '}
						<span className="snbex:font-black">
							{experienceMillions.toFixed(2)} million
						</span>{' '}
						experience!
					</div>
				</>
			);
		}

		switch (widgetState.state) {
			case 'idle':
				return (
					<div className="snbex:mt-3 snbex:text-center">
						<div className="snbex:text-lg snbex:font-bold snbex:mb-2">
							Ready to track content
						</div>
						<div className="snbex:text-sm snbex:text-gray-600 snbex:mb-4">
							Start tracking your learning progress on this site
						</div>
						<Button onClick={() => sendConsentResponse(true)} size="sm">
							Start Tracking
						</Button>
					</div>
				);

			case 'awaiting-consent':
				return (
					<div className="snbex:mt-3">
						<div className="snbex:text-lg snbex:font-bold snbex:mb-3 snbex:text-center">
							Content Tracking Consent
						</div>
						<div className="snbex:text-sm snbex:mb-4 snbex:text-center">
							Allow tracking of content on <strong>{widgetState.domain}</strong>
							?
						</div>
						{widgetState.metadata?.title && (
							<div className="snbex:text-xs snbex:text-gray-500 snbex:mb-4 snbex:text-center">
								{String(widgetState.metadata.title)}
							</div>
						)}
						<div className="snbex:flex snbex:gap-2 snbex:justify-center">
							<Button
								onClick={() => sendConsentResponse(true)}
								className="snbex:bg-blue-600 snbex:hover:bg-blue-700"
								size="sm"
							>
								Allow
							</Button>
							<Button
								onClick={() => sendConsentResponse(false)}
								variant="neutral"
								size="sm"
							>
								Deny
							</Button>
						</div>
					</div>
				);

			case 'recording-youtube':
			case 'recording-default':
				return (
					<div className="snbex:mt-3">
						<div className="snbex:flex snbex:items-center snbex:gap-2 snbex:mb-3">
							<div className="snbex:w-3 snbex:h-3 snbex:bg-red-500 snbex:rounded-full snbex:animate-pulse"></div>
							<div className="snbex:text-base snbex:font-bold">
								Recording{' '}
								{widgetState.provider === 'youtube' ? 'YouTube' : 'Content'}
							</div>
						</div>
						<div className="snbex:text-xs snbex:text-gray-500 snbex:mb-2">
							{widgetState.domain}
						</div>
						{widgetState.metadata?.title ? (
							<div className="snbex:text-sm snbex:font-medium snbex:mb-3 snbex:p-2 snbex:bg-gray-50 snbex:rounded-md">
								{String(widgetState.metadata.title)}
							</div>
						) : null}
						<Button
							onClick={stopRecording}
							variant="destructive"
							className="snbex:w-full"
							size="sm"
						>
							Stop Recording
						</Button>
					</div>
				);

			case 'default-tracking':
				return (
					<div className="snbex:mt-3">
						<div className="snbex:flex snbex:items-center snbex:gap-2 snbex:mb-3">
							<div className="snbex:w-3 snbex:h-3 snbex:bg-green-500 snbex:rounded-full snbex:animate-pulse"></div>
							<div className="snbex:text-base snbex:font-bold">
								Tracking Content
							</div>
						</div>
						<div className="snbex:text-xs snbex:text-gray-500 snbex:mb-2">
							{widgetState.domain}
						</div>
						{widgetState.metadata?.title ? (
							<div className="snbex:text-sm snbex:font-medium snbex:mb-2 snbex:p-2 snbex:bg-gray-50 snbex:rounded-md">
								{String(widgetState.metadata.title)}
							</div>
						) : null}
						{widgetState.metadata?.url ? (
							<div className="snbex:text-xs snbex:text-gray-400 snbex:mb-3 snbex:truncate">
								{String(widgetState.metadata.url)}
							</div>
						) : null}
						{widgetState.startTime ? (
							<div className="snbex:text-xs snbex:text-gray-600 snbex:mb-3">
								Session:{' '}
								{Math.floor((currentTime - widgetState.startTime) / 1000)}s
							</div>
						) : null}
						<Button
							onClick={stopRecording}
							variant="destructive"
							className="snbex:w-full"
							size="sm"
						>
							Stop Tracking
						</Button>
					</div>
				);

			case 'prompt-user-for-track':
				return (
					<div className="snbex:mt-3">
						<div className="snbex:text-lg snbex:font-bold snbex:mb-3 snbex:text-center">
							Language Detected!
						</div>
						<div className="snbex:text-sm snbex:mb-4 snbex:text-center">
							We detected content in{' '}
							<strong>{widgetState.detectedLanguage}</strong> on{' '}
							<strong>{widgetState.domain}</strong>
						</div>
						{widgetState.metadata?.title && (
							<div className="snbex:text-xs snbex:text-gray-500 snbex:mb-4 snbex:text-center">
								{String(widgetState.metadata.title)}
							</div>
						)}
						<div className="snbex:text-sm snbex:mb-4 snbex:text-center">
							Would you like to start tracking this content?
						</div>
						<div className="snbex:flex snbex:gap-2 snbex:justify-center">
							<Button
								onClick={() => sendConsentResponse(true)}
								className="snbex:bg-green-600 snbex:hover:bg-green-700"
								size="sm"
							>
								Start Tracking
							</Button>
							<Button
								onClick={() => sendConsentResponse(false)}
								variant="neutral"
								size="sm"
							>
								Not Now
							</Button>
						</div>
					</div>
				);

			case 'error':
				return (
					<div className="snbex:mt-3 snbex:text-center">
						<div className="snbex:text-lg snbex:font-bold snbex:mb-2 snbex:text-red-600">
							Error
						</div>
						<div className="snbex:text-sm snbex:text-gray-600 snbex:mb-4">
							{widgetState.error || 'Something went wrong'}
						</div>
						<Button
							onClick={retry}
							className="snbex:bg-blue-600 snbex:hover:bg-blue-700"
							size="sm"
						>
							Retry
						</Button>
					</div>
				);

			default:
				return (
					<div className="snbex:mt-3 snbex:text-center">
						<div className="snbex:text-sm snbex:text-gray-600">
							Unknown state: {widgetState.state}
						</div>
					</div>
				);
		}
	};

	const IconButton = (
		<motion.div
			ref={containerRef}
			className={`snbex:pointer-events-auto snbex:select-none snbex:fixed snbex:z-[50000] snbex:transition-opacity ${hovered ? 'snbex:opacity-100' : 'snbex:opacity-70'}`}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			drag
			dragMomentum={false}
			dragElastic={0}
			onDragStart={onDragStart}
			onDrag={handleDrag}
			onDragEnd={handleDragEnd}
			// Important: reset transform after drag so subsequent left/top math isn't compounded
			onUpdate={latest => {
				// If framer applied a transform via x/y, keep motion left/top as source of truth
				if (
					typeof (latest as Record<string, unknown>).x === 'number' ||
					typeof (latest as Record<string, unknown>).y === 'number'
				) {
					// no-op, but hook ensures we can extend if needed
				}
			}}
			onClickCapture={e => {
				if (isDragging || dragMovedRef.current) {
					e.preventDefault();
					e.stopPropagation();
				}
			}}
			animate={controls}
			style={{
				position: 'fixed',
				left: mvLeft,
				top: mvTop,
				zIndex: 50000,
				pointerEvents: 'auto',
				cursor: isDragging ? 'grabbing' : 'grab',
				userSelect: 'none',
				opacity: hovered ? 1 : 0.7,
				transition: 'opacity 150ms ease',
			}}
		>
			<div className="snbex:relative">
				<img
					src={iconUrl}
					alt="stupid-neko"
					className="snbex:h-10 snbex:w-10 snbex:rounded-full snbex:border-2 snbex:border-black snbex:shadow-[4px_4px_0_0_#000] snbex:bg-white"
					draggable={false}
					onDragStart={e => {
						e.preventDefault();
					}}
					style={{
						userSelect: 'none',
						display: 'block',
					}}
				/>
				<span className="snbex:absolute snbex:right-2 snbex:top-2 snbex:inline-flex snbex:items-center snbex:justify-center">
					<span className="snbex:absolute snbex:h-2 snbex:w-2 snbex:rounded-full snbex:bg-red-500" />
					<span className="snbex:absolute snbex:h-5 snbex:w-5 snbex:rounded-full snbex:bg-red-500/40" />
				</span>
			</div>
		</motion.div>
	);

	return (
		<Popover open={expanded} onOpenChange={setExpanded}>
			<PopoverTrigger asChild>{IconButton}</PopoverTrigger>
			<PopoverContent>{renderStateBasedContent()}</PopoverContent>
		</Popover>
	);
}
