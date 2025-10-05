import React from 'react';
import type { WidgetState } from '../../../pages/background/providers/types';
import { Badge } from '../../../components/ui/badge';
import { languageCodeToLabel } from '../../../../../../lib/languages';
import { CirclePause } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useUserInfo } from '../../hooks/useUserInfo';
import { useWidgetActions } from '../../hooks/useWidgetActions';

// Module-level cache to persist baseline across popover unmounts
const baselineCache: Record<string, number> = {};

const videoSelectors = [
    'video.html5-main-video',
    'video',
    '#movie_player video',
    '#player video',
    '.html5-video-player video',
];

function getVideoEl(): HTMLVideoElement | null {
    for (const selector of videoSelectors) {
        const el = document.querySelector(selector) as HTMLVideoElement | null;
        if (el) return el;
    }
    return null;
}

function getCurrentYouTubeVideoId(): string | undefined {
    try {
        const url = new URL(location.href);
        const vParam = url.searchParams.get('v');
        if (vParam) return vParam;
        if (url.hostname.endsWith('youtu.be')) {
            const seg = url.pathname.split('/').filter(Boolean)[0];
            if (seg) return seg;
        }
        if (url.pathname.startsWith('/shorts/')) {
            const seg = url.pathname.split('/').filter(Boolean)[1];
            if (seg) return seg;
        }
    } catch { }
    return undefined;
}

interface YouTubeTrackingVerifiedProps {
    widgetState: WidgetState;
    currentTime: number;
    renderDebugInfo?: () => React.ReactNode;
}

export const YouTubeTrackingVerified: React.FC<YouTubeTrackingVerifiedProps> = ({
    widgetState,
    currentTime,
    renderDebugInfo,
}) => {
    const userInfo = useUserInfo();
    const { youtubeBlockContent, youtubeStopRecording } = useWidgetActions();
    const [showStopOptions, setShowStopOptions] = React.useState(false);
    const startVideoSecondsRef = React.useRef<number | null>(null);
    const [videoSeconds, setVideoSeconds] = React.useState<number | null>(null);
    const videoIdRef = React.useRef<string | undefined>(undefined);
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    React.useEffect(() => {
        const id = getCurrentYouTubeVideoId();
        videoIdRef.current = id;

        // Initialize baseline from cache or localStorage, or fall back to current player time
        const initBaseline = () => {
            const cacheKey = id || 'default';
            let baseline: number | null = baselineCache[cacheKey] ?? null;

            if (baseline == null) {
                try {
                    const lsKey = id ? `snbex_youtube_baseline_${id}` : 'snbex_youtube_baseline';
                    const raw = localStorage.getItem(lsKey);
                    if (raw) {
                        const parsed = JSON.parse(raw) as { startCT?: number; };
                        if (typeof parsed?.startCT === 'number') baseline = parsed.startCT;
                    }
                } catch { }
            }

            if (baseline == null) {
                const v = getVideoEl();
                const wallElapsed = widgetState.startTime
                    ? Math.floor((Date.now() - widgetState.startTime) / 1000)
                    : null;
                if (v) {
                    const currentCT = Math.floor(v.currentTime || 0);
                    baseline = wallElapsed != null ? Math.max(0, currentCT - wallElapsed) : currentCT;
                } else {
                    baseline = wallElapsed != null ? Math.max(0, wallElapsed) : null;
                }
            }

            if (baseline != null) {
                baselineCache[cacheKey] = baseline;
            }
            startVideoSecondsRef.current = baseline;
        };
        initBaseline();

        const update = () => {
            const v = getVideoEl();
            if (v) {
                setVideoSeconds(Math.floor(v.currentTime || 0));
            } else {
                setVideoSeconds(null);
            }
        };

        update();
        const intervalId = window.setInterval(update, 1000);
        return () => window.clearInterval(intervalId);
    }, [widgetState.startTime]);

    const getDisplayedSeconds = (): number => {
        if (videoSeconds != null && startVideoSecondsRef.current != null) {
            return Math.max(0, videoSeconds - startVideoSecondsRef.current);
        }
        if (!widgetState.startTime) return 0;
        return Math.floor((currentTime - widgetState.startTime) / 1000);
    };

    return (
        <>
            <div className="">
                {/* Header with tracking indicator */}
                <div className="snbex:flex snbex:items-center snbex:gap-2 snbex:mb-3">
                    <div className="snbex:text-xl snbex:font-bold">
                        Tracking {formatTime(getDisplayedSeconds())} of Progress...
                    </div>
                </div>

                {/* Video title */}
                {widgetState.metadata?.title ? (
                    <div className="snbex:mb-2">
                        <div className="snbex:text-sm snbex:font-bold snbex:text-background snbex:mb-1">
                            Tracking {String(widgetState.metadata.title)}
                        </div>
                    </div>
                ) : null}



                {/* Stop tracking confirmation */}
                {showStopOptions ? (
                    <div className="snbex:flex snbex:gap-2">
                        <Button
                            onClick={() => {
                                youtubeBlockContent();
                            }}
                            className="snbex:w-full snbex:bg-foreground snbex:text-white snbex:bg-accent"
                        >
                            Never Again
                        </Button>
                        <Button
                            onClick={youtubeStopRecording}
                            className="snbex:w-full snbex:bg-foreground snbex:text-background"
                        >
                            Just This Time
                        </Button>
                    </div>
                ) : (
                    <Button
                        onClick={() => setShowStopOptions(true)}
                        className="snbex:w-full snbex:bg-accent"
                    >
                        <CirclePause className="snbex:w-5 snbex:h-5" />
                        Stop Tracking
                    </Button>
                )}
            </div>
            {renderDebugInfo?.()}
        </>
    );
};