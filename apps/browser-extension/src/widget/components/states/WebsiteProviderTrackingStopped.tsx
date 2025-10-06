import React from 'react';
import { Button } from '../../../components/ui/button';
import type { WidgetState } from '../../../pages/background/providers/types';
import { useWidgetActions } from '../../hooks/useWidgetActions';

interface Props {
    widgetState: WidgetState;
    renderDebugInfo?: () => React.ReactNode;
}

export const WebsiteProviderTrackingStopped: React.FC<Props> = ({
    widgetState,
    renderDebugInfo,
}) => {
    const { defaultTrackAnyway } = useWidgetActions();
    return (
        <>
            <div className="snbex:mt-3 snbex:text-center">
                <div className="snbex:text-lg snbex:font-bold snbex:mb-2">Tracking stopped</div>
                <Button size="sm" onClick={defaultTrackAnyway}>Track anyway</Button>
            </div>
            {renderDebugInfo?.()}
        </>
    );
};

