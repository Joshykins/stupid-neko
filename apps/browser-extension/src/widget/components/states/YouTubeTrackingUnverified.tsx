import React from 'react';
import type { WidgetState } from '../../../pages/background/providers/types';
import { HiddenState } from './HiddenState';
import { YouTubeIcon } from '../icons/YouTubeIcon';

interface YouTubeTrackingUnverifiedProps {
    widgetState: WidgetState;
    renderDebugInfo?: () => React.ReactNode;
}

export const YouTubeTrackingUnverified: React.FC<YouTubeTrackingUnverifiedProps> = ({
    widgetState,
    renderDebugInfo,
}) => {
    return (
        <HiddenState
            widgetState={widgetState}
            title="Analyzing Content"
            description="Determining if content matches your target language..."
            iconLeft={<YouTubeIcon className="snbex:w-6 snbex:h-6 snbex:text-background" />}
            renderDebugInfo={renderDebugInfo}
        />
    );
};
