import { motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Minimize2 } from 'lucide-react';
import type { LanguageCode } from '../../../../convex/schema';
import { useAuth } from '../components/hooks/useAuth';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '../components/ui/popover';
import { DevDebugComponent } from './components/DevDebugComponent';
import {
	useWidgetState,
	useUserInfo,
	useWidgetActions,
	useWidgetPosition,
} from './hooks';
import { getWidgetStateConfig } from './config/widgetStates';
import { DefaultProviderIdle } from './components/states/DefaultProviderIdle';
import { YouTubeNotTracking } from './components/states/YouTubeNotTracking';
import { YouTubeTrackingUnverified } from './components/states/YouTubeTrackingUnverified';
import { YouTubeTrackingVerified } from './components/states/YouTubeTrackingVerified';
import { DeterminingProvider } from './components/states/DeterminingProvider';
import { DefaultProviderTracking } from './components/states/DefaultProviderTracking';
import { ErrorState } from './components/states/ErrorState';
import { DefaultState } from './components/states/DefaultState';
import { DefaultProviderIdleDetected } from './components/states/DefaultProviderIdleDetected';
import { DefaultProviderAlwaysTrackQuestion } from './components/states/DefaultProviderAlwaysTrackQuestion';
import { DefaultProviderTrackingStopped } from './components/states/DefaultProviderTrackingStopped';
import { YouTubeProviderTrackingStopped } from './components/states/YouTubeProviderTrackingStopped';
import { ContentBlocked } from './components/states/ContentBlocked';
import { DefaultProviderNotTracking } from './components/states/DefaultProviderNotTracking';
import { IconButton } from '../components/ui/IconButton';
import { cn } from '../lib/utils';

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
	const suppressNextClickRef = useRef(false);

	// Use custom hooks for state management
	const widgetState = useWidgetState();
	const userInfo = useUserInfo(props);
	const { } = useWidgetActions();
	const {
		position,
		controls,
		dragMovedRef,
		onDragStart,
		onDrag,
		onDragEnd,
	} = useWidgetPosition();


	// Calculate optimal popover side based on widget position
	const popoverSide = useMemo(() => {
		const screenCenter = window.innerWidth / 2;
		const widgetCenter = position.left + 20; // 20px is half the widget width (40px)
		return widgetCenter < screenCenter ? 'right' : 'left';
	}, [position.left]);

	const [iconUrl, setIconUrl] = useState<string>('');
	const [currentTime, setCurrentTime] = useState(Date.now());

	//Widget state config
	const config = getWidgetStateConfig(widgetState.state);
	// Check if we're in dangerous testing mode
	const isDangerousTesting = import.meta.env.VITE_DANGEROUS_TESTING === 'enabled';

	useEffect(() => {
		try {
			// Use dev icon in dangerous testing mode, otherwise use regular icon
			const iconName = isDangerousTesting ? 'dev-icon-128.png' : 'icon-128.png';
			const url = chrome.runtime.getURL(iconName);
			// console.log(`[TrackingWidget] Setting icon: ${iconName}, URL: ${url}, isDangerousTesting: ${isDangerousTesting}`);
			setIconUrl(url);
		} catch (error) {
			// console.warn('[TrackingWidget] Failed to get icon URL:', error);
			// Fallback to regular icon if dev icon fails to load
			const iconName = isDangerousTesting ? 'dev-icon-128.png' : 'icon-128.png';
			setIconUrl(`/${iconName}`);
		}
	}, [isDangerousTesting]);

	// Update timer every second when tracking
	useEffect(() => {
		// Show timer for tracking states
		const trackingStates = ['default-provider-tracking', 'youtube-tracking-verified'];
		if (trackingStates.includes(widgetState.state) && widgetState.startTime) {
			const interval = setInterval(() => {
				setCurrentTime(Date.now());
			}, 1000);
			return () => clearInterval(interval);
		}
	}, [widgetState.state, widgetState.startTime]);

	// Auto-expand/collapse based on widget state
	useEffect(() => {
		// Use centralized visibility logic
		const config = getWidgetStateConfig(widgetState.state);

		// Handle force always expanded states
		if (config.forceAlwaysExpanded) {
			setExpanded(true);
		} else if (config.openOnLoad) {
			setExpanded(true);
		}
		// For other states, don't change the expanded state
		// This prevents the widget from opening/closing when cycling through states
	}, [widgetState.state]);

	// Handle forceAlwaysExpanded reopening after drag ends
	// Temporarily disabled to test if this is causing the positioning issue
	// useEffect(() => {
	// 	if (!isDragging && widgetState) {
	// 		const config = getWidgetStateConfig(widgetState.state);
	// 		if (config.forceAlwaysExpanded && !expanded) {
	// 			// Small delay to ensure positioning is complete
	// 			const timer = setTimeout(() => {
	// 				setExpanded(true);
	// 			}, 300);
	// 			return () => clearTimeout(timer);
	// 		}
	// 	}
	// }, [isDragging, widgetState, expanded]);

	const contentLabel: string = useMemo(() => {
		try {
			const raw = localStorage.getItem('lastContentLabel');
			if (raw) {
				const parsed = JSON.parse(raw);
				if (typeof parsed?.title === 'string' && parsed.title.trim().length > 0)
					return parsed.title.trim();
			}
		} catch { }
		try {
			const title = document.title.replace(/ - YouTube$/, '').trim();
			if (title) return title;
		} catch { }
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

	// Enhanced drag handlers with popover management
	const handleDrag = (
		_e: unknown,
		info: { offset: { x: number; y: number; }; }
	) => {
		const dx = Math.abs(info?.offset?.x || 0);
		const dy = Math.abs(info?.offset?.y || 0);
		if (dx > 5 || dy > 5) {
			setIsDragging(true);
			// Temporarily disable popover closing during drag to test positioning
			// setExpanded(false);
		}
		onDrag(_e, info);
	};

	const handleDragEnd = (
		_e: unknown,
		info: { offset: { x: number; y: number; }; }
	) => {
		// Temporarily suppress the immediate click that can fire after drag release
		suppressNextClickRef.current = true;
		setTimeout(() => {
			suppressNextClickRef.current = false;
		}, 150);
		setIsDragging(false);
		onDragEnd(_e, info);

		// Note: We'll handle forceAlwaysExpanded reopening in a separate effect
		// to avoid interfering with the positioning animation
	};

	// Render content based on widget state
	const renderStateBasedContent = () => {
		const renderDebugInfo = () => {
			if (!isDangerousTesting) return null;
			return (
				<DevDebugComponent
					widgetState={widgetState}
					userInfo={userInfo}
					currentTime={currentTime}
				/>
			);
		};

		if (!widgetState) {
			// Default content when no state is provided
			return (
				<DefaultState
					userName={userInfo.userName}
					targetLanguage={props.languageCode}
					renderDebugInfo={renderDebugInfo}
				/>
			);
		}

		switch (widgetState.state) {
			case 'content-blocked':
				return (
					<ContentBlocked
						widgetState={widgetState}
						renderDebugInfo={renderDebugInfo}
					/>
				);
			case 'default-provider-idle':
				return (
					<DefaultProviderIdle
						widgetState={widgetState}
						renderDebugInfo={renderDebugInfo}
					/>
				);

			case 'youtube-not-tracking':
				return (
					<YouTubeNotTracking
						widgetState={widgetState}
						renderDebugInfo={renderDebugInfo}
					/>
				);

			case 'youtube-tracking-unverified':
				return (
					<YouTubeTrackingUnverified
						widgetState={widgetState}
						renderDebugInfo={renderDebugInfo}
					/>
				);

			case 'youtube-tracking-verified':
				return (
					<YouTubeTrackingVerified
						widgetState={widgetState}
						currentTime={currentTime}
						renderDebugInfo={renderDebugInfo}
					/>
				);

			case 'determining-provider':
				return (
					<DeterminingProvider
						widgetState={widgetState}
						renderDebugInfo={renderDebugInfo}
					/>
				);

			case 'default-provider-idle-detected':
				return (
					<DefaultProviderIdleDetected
						widgetState={widgetState}
						renderDebugInfo={renderDebugInfo}
					/>
				);

			case 'default-provider-always-track-question':
				return (
					<DefaultProviderAlwaysTrackQuestion
						widgetState={widgetState}
						renderDebugInfo={renderDebugInfo}
					/>
				);

			case 'default-provider-tracking':
				return (
					<DefaultProviderTracking
						widgetState={widgetState}
						currentTime={currentTime}
						renderDebugInfo={renderDebugInfo}
					/>
				);

			case 'default-provider-tracking-stopped':
				return (
					<DefaultProviderTrackingStopped
						widgetState={widgetState}
						renderDebugInfo={renderDebugInfo}
					/>
				);

			case 'youtube-provider-tracking-stopped':
				return (
					<YouTubeProviderTrackingStopped
						widgetState={widgetState}
						renderDebugInfo={renderDebugInfo}
					/>
				);

			case 'default-provider-not-tracking':
				return (
					<DefaultProviderNotTracking
						widgetState={widgetState}
						renderDebugInfo={renderDebugInfo}
					/>
				);

			case 'error':
				return (
					<ErrorState
						widgetState={widgetState}
						renderDebugInfo={renderDebugInfo}
					/>
				);

			default:
				return (
					<>
						<div className="snbex:mt-3 snbex:text-center">
							<div className="snbex:text-sm snbex:text-gray-600">
								Unknown state: {widgetState.state}
							</div>
						</div>
						{renderDebugInfo()}
					</>
				);
		}
	};

	const WidgetContainer = (
		<motion.div
			ref={containerRef}
			className={`snbex:pointer-events-auto snbex:select-none snbex:transition-opacity ${hovered ? 'snbex:opacity-100' : 'snbex:opacity-70'}`}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}

			drag
			dragMomentum={false}
			dragElastic={0}
			onDragStart={() => {
				setIsDragging(true);
				onDragStart();
			}}
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
			// Prevent click immediately after drag to avoid unintended popover open
			onClickCapture={(e) => {
				if (suppressNextClickRef.current || dragMovedRef.current || isDragging) {
					suppressNextClickRef.current = false;
					e.preventDefault();
					e.stopPropagation();
				}
			}}
			animate={controls}
			style={{
				position: 'fixed',
				left: position.left,
				top: position.top,
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
					className={cn("snbex:h-10 snbex:w-10 snbex:rounded-full snbex:border-2 snbex:border-black snbex:shadow-[4px_4px_0_0_#000] snbex:bg-white",
						// Make black and white if not tracking
						!config.isTracking ? 'snbex:grayscale-75' : ''
					)}
					draggable={false}
					onDragStart={e => {
						e.preventDefault();
					}}
					style={{
						userSelect: 'none',
						display: 'block',
					}}
				/>
				<span className={cn("snbex:absolute snbex:right-2 snbex:top-2 snbex:inline-flex snbex:items-center snbex:justify-center transition-opacity duration-300",
					// Make black and white if not tracking
					!config.isTracking ? 'snbex:opacity-0' : 'snbex:opacity-100'
				)}>
					<span className="snbex:absolute snbex:h-2 snbex:w-2 snbex:rounded-full snbex:bg-red-500" />
					<span className="snbex:absolute snbex:h-5 snbex:w-5 snbex:rounded-full snbex:bg-red-500/40" />
				</span>
			</div>
		</motion.div>
	);

	// Don't render anything if in hidden states (unless in dangerous testing mode)
	if (config.visibility === 'hidden' && !isDangerousTesting) {
		return null;
	}

	// Handle popover open/close with respect to forceAlwaysExpanded
	const handleOpenChange = (newOpen: boolean) => {
		const config = getWidgetStateConfig(widgetState.state);
		if (config.forceAlwaysExpanded && !newOpen) {
			// Don't allow closing if forceAlwaysExpanded is true
			return;
		}
		console.log("handleOpenChange", newOpen);
		setExpanded(newOpen);
	};

	console.log("expanded", expanded);
	return (
		<Popover
			open={expanded}
			onOpenChange={handleOpenChange}
		>
			<PopoverTrigger asChild>
				{WidgetContainer}
			</PopoverTrigger>
			<PopoverContent
				side={popoverSide}
				className='snbex:p-4 snbex:relative'
			>
				{/* Minimize button - only show if not forceAlwaysExpanded */}
				{!getWidgetStateConfig(widgetState.state).forceAlwaysExpanded && (
					<IconButton
						title="Minimize widget"
						className="snbex:absolute snbex:top-2 snbex:right-2"
						onClick={() => handleOpenChange(false)}
						borderless
					>
						<Minimize2 className="snbex:h-4 snbex:w-4" />
					</IconButton>
				)}
				{renderStateBasedContent()}
			</PopoverContent>
		</Popover>
	);
}

