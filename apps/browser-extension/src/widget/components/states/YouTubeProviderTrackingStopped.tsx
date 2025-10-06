import React from 'react';
import type { WidgetState } from '../../../pages/background/providers/types';
import { Button } from '../../../components/ui/button';
import { useWidgetActions } from '../../hooks/useWidgetActions';
import { YouTubeIcon } from '../icons/YouTubeIcon';

interface Props {
    widgetState: WidgetState;
    renderDebugInfo?: () => React.ReactNode;
}

export const YouTubeProviderTrackingStopped: React.FC<Props> = ({
    widgetState,
    renderDebugInfo,
}) => {
    const { youtubeTrackAnyway } = useWidgetActions();
    return (
        <>
            <div >
                <div className="snbex:flex snbex:items-center snbex:gap-2 snbex:mb-2">
                    <YouTubeIcon className="snbex:w-6 snbex:h-6 snbex:text-background" />
                    <div className="snbex:text-lg snbex:font-bold">YouTube tracking stopped</div>
                </div>
                {widgetState.metadata?.title ? (
                    <div className="snbex:text-xs snbex:text-muted-foreground snbex:mb-2">
                        {String(widgetState.metadata.title)}
                    </div>
                ) : null}
                <Button className='snbex:w-full snbex:mt-3 snbex:bg-foreground snbex:text-background' onClick={youtubeTrackAnyway}>Track anyway</Button>
            </div>
            {renderDebugInfo?.()}
        </>
    );
};


