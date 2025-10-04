import React from 'react';
import type { WidgetState } from '../../../pages/background/providers/types';
import { Badge } from '../../../components/ui/badge';
import { languageCodeToLabel } from '../../../../../../lib/languages';
import { CirclePause } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useUserInfo } from '../../hooks/useUserInfo';
import { useWidgetActions } from '../../hooks/useWidgetActions';

interface YouTubeTrackingVerifiedProps {
    widgetState: WidgetState;
    currentTime: number;
    stopRecording: () => void;
    renderDebugInfo?: () => React.ReactNode;
}

export const YouTubeTrackingVerified: React.FC<YouTubeTrackingVerifiedProps> = ({
    widgetState,
    currentTime,
    stopRecording,
    renderDebugInfo,
}) => {
    const userInfo = useUserInfo();
    const { blacklistContent } = useWidgetActions();
    const [showStopOptions, setShowStopOptions] = React.useState(false);
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getCurrentPosition = (): number => {
        if (!widgetState.startTime) return 0;
        return Math.floor((currentTime - widgetState.startTime) / 1000);
    };

    return (
        <>
            <div className="">
                {/* Header with tracking indicator */}
                <div className="snbex:flex snbex:items-center snbex:gap-2 snbex:mb-3">
                    <div className="snbex:text-xl snbex:font-bold">
                        Tracking {formatTime(getCurrentPosition())} of Progress...
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
                                blacklistContent();
                            }}
                            className="snbex:w-full snbex:bg-foreground snbex:text-background snbex:bg-red-400/50"
                        >
                            Never Again
                        </Button>
                        <Button
                            onClick={stopRecording}
                            className="snbex:w-full snbex:bg-accent"
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