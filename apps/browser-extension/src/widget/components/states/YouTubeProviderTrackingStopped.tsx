import React from 'react';
import type { WidgetState } from '../../../pages/background/providers/types';
import { Button } from '../../../components/ui/button';
import { useWidgetActions } from '../../hooks/useWidgetActions';

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
                <div className="snbex:text-lg snbex:font-bold snbex:mb-2">YouTube tracking stopped</div>
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


