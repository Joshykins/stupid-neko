import React from 'react';
import type { WidgetState } from '../../../pages/background/providers/types';
import { CirclePause } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useWidgetActions } from '../../hooks/useWidgetActions';
import { YouTubeIcon } from '../icons/YouTubeIcon';





interface YouTubeTrackingVerifiedProps {
    widgetState: WidgetState;
    currentTime: number; // wall clock ms now from widget container
    renderDebugInfo?: () => React.ReactNode;
}

export const YouTubeTrackingVerified: React.FC<YouTubeTrackingVerifiedProps> = ({
    widgetState,
    currentTime,
    renderDebugInfo,
}) => {

    const { youtubeBlockContent, youtubeStopRecording } = useWidgetActions();
    const [showStopOptions, setShowStopOptions] = React.useState(false);


    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const computeSessionSeconds = (): number => {
        const base = widgetState.sessionActiveMs ?? 0;
        const extra = widgetState.isPlaying && widgetState.sessionStartedAt
            ? Math.max(0, currentTime - widgetState.sessionStartedAt)
            : 0;
        return Math.floor((base + extra) / 1000);
    };



    const trackingStopped = widgetState.playbackStatus !== 'playing';

    return (
        <>
            <div className="">
                {/* Header with tracking indicator */}
                <div className="snbex:flex snbex:items-center snbex:gap-2 snbex:mb-3">
                    <YouTubeIcon className="snbex:w-6 snbex:h-6 snbex:text-background" />
                    <div className="snbex:text-lg snbex:font-bold">Tracking {formatTime(computeSessionSeconds())} of Progress...</div>
                </div>

                {/* Playback status */}
                {widgetState.playbackStatus && widgetState.playbackStatus !== 'playing' && (
                    <div className="snbex:mb-2 snbex:text-sm snbex:text-background/80">
                        {widgetState.playbackStatus === 'paused' ? 'Video paused — tracking stopped' : 'Video ended — tracking stopped'}
                    </div>
                )}

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
                            className="snbex:w-full snbex:bg-accent snbex:text-white"
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
                    <>
                        {!trackingStopped && (
                            <Button
                                onClick={() => setShowStopOptions(true)}
                                className="snbex:w-full snbex:bg-accent"
                            >
                                <CirclePause className="snbex:w-5 snbex:h-5" />
                                Stop Tracking
                            </Button>)}
                    </>
                )}
            </div>
            {renderDebugInfo?.()}
        </>
    );
};