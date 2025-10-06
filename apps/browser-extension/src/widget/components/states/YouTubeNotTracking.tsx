import React from 'react';
import type { WidgetState } from '../../../pages/background/providers/types';
import { HiddenState } from './HiddenState';
import { YouTubeIcon } from '../icons/YouTubeIcon';

interface YouTubeNotTrackingProps {
    widgetState: WidgetState;
    renderDebugInfo?: () => React.ReactNode;
}

export const YouTubeNotTracking: React.FC<YouTubeNotTrackingProps> = ({
    widgetState,
    renderDebugInfo,
}) => {
    return (
        <HiddenState
            widgetState={widgetState}
            title="Not Tracking"
            description="Content is not in your target language"
            iconLeft={<YouTubeIcon className="snbex:w-6 snbex:h-6 snbex:text-background" />}
            renderDebugInfo={renderDebugInfo}
        />
    );
};
