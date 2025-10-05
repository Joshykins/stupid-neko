import React from 'react';
import { Button } from '../../../components/ui/button';
import type { WidgetState } from '../../../pages/background/providers/types';
import { useWidgetActions } from '../../hooks/useWidgetActions';

interface Props {
    widgetState: WidgetState;
    renderDebugInfo?: () => React.ReactNode;
}

export const DefaultProviderIdleDetected: React.FC<Props> = ({
    widgetState,
    renderDebugInfo,
}) => {
    const { defaultDontTrack, defaultOpenAlwaysTrackQuestion } = useWidgetActions();
    const domain = widgetState.domain || 'this site';
    return (
        <>
            <div >
                <div className="snbex:text-lg snbex:font-bold snbex:mb-2">
                    Want to track this?
                </div>
                {widgetState.metadata?.title && (
                    <div className="snbex:text-sm snbex:mb-2 snbex:truncate snbex:max-w-[260px]">
                        {String(widgetState.metadata.title)}
                    </div>
                )}
                <div className="snbex:text-xs snbex:text-gray-500 snbex:mb-3">{domain}</div>
                <div className="snbex:flex snbex:gap-2">
                    <Button variant="neutral" size="sm" onClick={defaultDontTrack}>Dont Track</Button>
                    <Button size="sm" onClick={defaultOpenAlwaysTrackQuestion}>Track This!</Button>
                </div>
            </div>
            {renderDebugInfo?.()}
        </>
    );
};


