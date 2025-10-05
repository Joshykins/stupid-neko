import React, { useEffect, useMemo } from 'react';
import { Button } from '../../../components/ui/button';
import type { WidgetState } from '../../../pages/background/providers/types';
import { useWidgetActions } from '../../hooks/useWidgetActions';
import { Globe2 } from 'lucide-react';
import { callBackground } from '../../../messaging/messagesContentRouter';

interface DefaultProviderTrackingProps {
    widgetState: WidgetState;
    currentTime: number;
    renderDebugInfo?: () => React.ReactNode;
}

export const DefaultProviderTracking: React.FC<DefaultProviderTrackingProps> = ({
    widgetState,
    currentTime,
    renderDebugInfo,
}) => {
    const { defaultStopRecording } = useWidgetActions();

    const elapsedLabel = useMemo(() => {
        const start = widgetState.startTime ?? 0;
        const elapsedMs = Math.max(0, currentTime - start);
        const totalSeconds = Math.floor(elapsedMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const secondsPadded = seconds < 10 ? `0${seconds}` : `${seconds}`;
        return `${minutes}:${secondsPadded}`;
    }, [currentTime, widgetState.startTime]);

    // Send heartbeats while tracking on the active tab
    useEffect(() => {
        if (widgetState.state !== 'default-provider-tracking') return;

        const intervalId = window.setInterval(() => {
            void callBackground('PLAYBACK_EVENT', {
                payload: {
                    source: 'website',
                    event: 'progress',
                    url: window.location.href,
                    ts: Date.now(),
                },
            }).catch(() => { });
        }, 5000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [widgetState.state]);
    return (
        <>
            <div >
                <div className="snbex:flex snbex:items-center snbex:gap-2 snbex:mb-2">
                    <Globe2 className="snbex:w-6 snbex:h-6" />
                    <div className="snbex:text-lg snbex:font-bold">
                        Tracking {elapsedLabel} of Progress...
                    </div>
                </div>
                <div className="snbex:text-sm snbex:font-medium snbex:text-background snbex:mb-4">Tracking your time across <span className="snbex:font-bold">{widgetState.domain}</span></div>

                <Button
                    onClick={defaultStopRecording}
                    className="snbex:w-full snbex:bg-accent mt-3"
                >
                    Stop Tracking
                </Button>
            </div>
            {renderDebugInfo?.()}
        </>
    );
};
