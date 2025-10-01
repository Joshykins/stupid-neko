import React from 'react';
import type { WidgetState } from '../../../pages/background/providers/types';
import { Badge } from '../../../components/ui/badge';
import { languageCodeToLabel } from '../../../../../../lib/languages';
import { CirclePause } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useUserInfo } from '../../hooks/useUserInfo';

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
                        Tracking Progress...
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

                {/* Language tag and timer */}
                <div className="snbex:flex snbex:items-center snbex:justify-between snbex:mb-3">
                    {/* Language learning tag */}
                    {userInfo.languageCode && (
                        <Badge variant="default" className="snbex:gap-1 snbex:bg-white">
                            <span className="snbex:text-xs snbex:font-medium">
                                Learning {languageCodeToLabel(userInfo.languageCode)}
                            </span>
                        </Badge>
                    )}

                    {/* Timer */}
                    {widgetState.startTime && (
                        <div className="snbex:text-sm snbex:font-medium snbex:text-[#364F6B]">
                            {formatTime(getCurrentPosition())}
                        </div>
                    )}
                </div>

                {/* Stop tracking button */}
                <Button
                    onClick={stopRecording}
                    className="snbex:w-full snbex:bg-accent"
                >
                    <CirclePause className="snbex:w-5 snbex:h-5" />
                    Stop Tracking
                </Button>
            </div>
            {renderDebugInfo?.()}
        </>
    );
};