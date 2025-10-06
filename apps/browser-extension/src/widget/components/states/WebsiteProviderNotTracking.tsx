import React from 'react';
import { Button } from '../../../components/ui/button';
import type { WidgetState } from '../../../pages/background/providers/types';
import { useWidgetActions } from '../../hooks/useWidgetActions';

interface Props {
    widgetState: WidgetState;
    renderDebugInfo?: () => React.ReactNode;
}

export const WebsiteProviderNotTracking: React.FC<Props> = ({
    widgetState,
    renderDebugInfo,
}) => {
    const { defaultTrackAnyway } = useWidgetActions();
    return (
        <>
            <div >
                <div className="snbex:text-lg snbex:font-bold snbex:mb-2">Not tracking</div>
                <Button className='snbex:w-full snbex:mt-3 snbex:bg-foreground snbex:text-background' onClick={defaultTrackAnyway}>Track anyway</Button>
            </div>
            {renderDebugInfo?.()}
        </>
    );
};

