import React from 'react';
import { Button } from '../../../components/ui/button';
import type { WidgetState } from '../../../pages/background/providers/types';

interface DefaultProviderTrackingProps {
    widgetState: WidgetState;
    currentTime: number;
    stopRecording: () => void;
    renderDebugInfo?: () => React.ReactNode;
}

export const DefaultProviderTracking: React.FC<DefaultProviderTrackingProps> = ({
    widgetState,
    currentTime,
    stopRecording,
    renderDebugInfo,
}) => {
    return (
        <>
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
            {renderDebugInfo?.()}
        </>
    );
};
