import React from 'react';
import type { WidgetState } from '../../../pages/background/providers/types';
import { HiddenState } from './HiddenState';

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
            renderDebugInfo={renderDebugInfo}
        />
    );
};
