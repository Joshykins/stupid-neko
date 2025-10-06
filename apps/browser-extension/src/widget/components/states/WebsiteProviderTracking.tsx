import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../../../components/ui/button';
import type { WidgetState } from '../../../pages/background/providers/types';
import { useWidgetActions } from '../../hooks/useWidgetActions';
import { Globe2 } from 'lucide-react';
import { callBackground } from '../../../messaging/messagesContentRouter';

interface WebsiteProviderTrackingProps {
    widgetState: WidgetState;
    currentTime: number;
    renderDebugInfo?: () => React.ReactNode;
}

export const WebsiteProviderTracking: React.FC<WebsiteProviderTrackingProps> = ({
    widgetState,
    currentTime,
    renderDebugInfo,
}) => {
    const { defaultStopRecording } = useWidgetActions();

    const [pausedOffsetMs, setPausedOffsetMs] = useState(0);
    const hiddenSinceRef = useRef<number | null>(null);

    const elapsedLabel = useMemo(() => {
        const start = widgetState.startTime ?? 0;
        const elapsedMs = Math.max(0, currentTime - start - pausedOffsetMs);
        const totalSeconds = Math.floor(elapsedMs / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const secondsPadded = seconds < 10 ? `0${seconds}` : `${seconds}`;
        return `${minutes}:${secondsPadded}`;
    }, [currentTime, widgetState.startTime, pausedOffsetMs]);

    // Send heartbeats only while tab is visible and tracking
    useEffect(() => {
        if (widgetState.state !== 'website-provider-tracking') return;

        let intervalId: number | null = null;
        const refreshHeartbeat = () => {
            if (intervalId) {
                window.clearInterval(intervalId);
                intervalId = null;
            }
            if (document.visibilityState === 'visible') {
                intervalId = window.setInterval(() => {
                    void callBackground('PLAYBACK_EVENT', {
                        payload: {
                            source: 'website',
                            event: 'progress',
                            url: window.location.href,
                            ts: Date.now(),
                        },
                    }).catch(() => { });
                }, 5000);
            }
        };

        // Initial setup and listen for tab visibility changes
        refreshHeartbeat();
        const onVisibility = () => refreshHeartbeat();
        document.addEventListener('visibilitychange', onVisibility, { passive: true } as any);

        return () => {
            document.removeEventListener('visibilitychange', onVisibility as any);
            if (intervalId) window.clearInterval(intervalId);
        };
    }, [widgetState.state]);

    // Track tab visibility to pause/resume elapsed timer locally
    useEffect(() => {
        if (widgetState.state !== 'website-provider-tracking') {
            setPausedOffsetMs(0);
            hiddenSinceRef.current = null;
            return;
        }

        // Initialize hidden start based on current visibility
        hiddenSinceRef.current = document.visibilityState === 'hidden' ? Date.now() : null;

        const onVisibility = () => {
            if (document.visibilityState === 'hidden') {
                hiddenSinceRef.current = Date.now();
            } else {
                if (hiddenSinceRef.current != null) {
                    setPausedOffsetMs(prev => prev + (Date.now() - hiddenSinceRef.current!));
                    hiddenSinceRef.current = null;
                }
            }
        };

        document.addEventListener('visibilitychange', onVisibility, { passive: true } as any);
        return () => {
            document.removeEventListener('visibilitychange', onVisibility as any);
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

