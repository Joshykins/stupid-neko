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
import {
	DefaultProviderIdle,
	YouTubeIdle,
	DeterminingProvider,
	DefaultProviderAwaitingConsent,
	YouTubeTracking,
	DefaultProviderTracking,
	DefaultProviderPromptUser,
	ErrorState,
	DefaultState,
} from './components/states';
import { IconButton } from '../components/ui/IconButton';

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

	// Check if we're in dangerous testing mode
	const isDangerousTesting = import.meta.env.VITE_DANGEROUS_TESTING === 'enabled';

	useEffect(() => {
		try {
			// Use dev icon in dangerous testing mode, otherwise use regular icon
			const iconName = isDangerousTesting ? 'dev-icon-128.png' : 'icon-128.png';
			const url = chrome.runtime.getURL(iconName);
			console.log(`[TrackingWidget] Setting icon: ${iconName}, URL: ${url}, isDangerousTesting: ${isDangerousTesting}`);
			setIconUrl(url);
		} catch (error) {
			console.warn('[TrackingWidget] Failed to get icon URL:', error);
			// Fallback to regular icon if dev icon fails to load
			const iconName = isDangerousTesting ? 'dev-icon-128.png' : 'icon-128.png';
			setIconUrl(`/${iconName}`);
		}
	}, [isDangerousTesting]);

	// Update timer every second when tracking
	useEffect(() => {
		const config = getWidgetStateConfig(widgetState.state);
		if (config.showTimer && widgetState.startTime) {
			const interval = setInterval(() => {
				setCurrentTime(Date.now());
			}, 1000);
			return () => clearInterval(interval);
		}
	}, [widgetState.state, widgetState.startTime]);

	// Auto-expand/collapse based on widget state
	useEffect(() => {
		// In dangerous testing mode, never collapse the widget
		if (isDangerousTesting) {
			setExpanded(true);
			return;
		}

		// Use centralized visibility logic
		const config = getWidgetStateConfig(widgetState.state);
		if (config.visibility === 'visible') {
			setExpanded(true);
		} else {
			setExpanded(false);
		}
	}, [widgetState.state, isDangerousTesting]);

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
		if (dx > 2 || dy > 2) {
			setIsDragging(true);
			// Close popover
			setExpanded(false);
		}
		onDrag(_e, info);
	};

	const handleDragEnd = async (
		_e: unknown,
		info: { offset: { x: number; y: number; }; }
	) => {
		setIsDragging(false);
		await onDragEnd(_e, info);
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
			case 'default-provider-idle':
				return (
					<DefaultProviderIdle
						widgetState={widgetState}
						sendConsentResponse={sendConsentResponse}
						renderDebugInfo={renderDebugInfo}
					/>
				);

			case 'youtube-idle':
				return (
					<YouTubeIdle
						widgetState={widgetState}
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

			case 'default-provider-awaiting-consent':
				return (
					<DefaultProviderAwaitingConsent
						widgetState={widgetState}
						sendConsentResponse={sendConsentResponse}
						renderDebugInfo={renderDebugInfo}
					/>
				);

			case 'youtube-tracking':
				return (
					<YouTubeTracking
						widgetState={widgetState}
						currentTime={currentTime}
						stopRecording={stopRecording}
						renderDebugInfo={renderDebugInfo}
					/>
				);

			case 'default-provider-tracking':
				return (
					<DefaultProviderTracking
						widgetState={widgetState}
						currentTime={currentTime}
						stopRecording={stopRecording}
						renderDebugInfo={renderDebugInfo}
					/>
				);

			case 'default-provider-prompt-user-for-track':
				return (
					<DefaultProviderPromptUser
						widgetState={widgetState}
						sendConsentResponse={sendConsentResponse}
						renderDebugInfo={renderDebugInfo}
					/>
				);

			case 'error':
				return (
					<ErrorState
						widgetState={widgetState}
						retry={retry}
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

	const WidgetButton = (
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

	// Don't render anything if in hidden states (unless in dangerous testing mode)
	const config = getWidgetStateConfig(widgetState.state);
	if (config.visibility === 'hidden' && !isDangerousTesting) {
		return null;
	}

	return (
		<Popover
			open={expanded}
			onOpenChange={setExpanded}
		>
			<PopoverTrigger asChild>{WidgetButton}</PopoverTrigger>
			<PopoverContent className='snbex:p-4 snbex:relative'>
				{/* Minimize button */}
				<IconButton
					title="Minimize widget"
					className="snbex:absolute snbex:top-2 snbex:right-2"
					onClick={() => setExpanded(false)}
					borderless
				>
					<Minimize2 className="snbex:h-4 snbex:w-4" />
				</IconButton>
				{renderStateBasedContent()}
			</PopoverContent>
		</Popover>
	);
}
