import React from 'react';
import { Button } from '../../../components/ui/button';
import type { WidgetState } from '../../../pages/background/providers/types';
import { useWidgetActions } from '../../hooks/useWidgetActions';
import { Globe, Globe2 } from 'lucide-react';

interface DefaultProviderIdleProps {
    widgetState: WidgetState;
    renderDebugInfo?: () => React.ReactNode;
}

export const DefaultProviderIdle: React.FC<DefaultProviderIdleProps> = ({
    widgetState,
    renderDebugInfo,
}) => {
    const { defaultOpenAlwaysTrackQuestion } = useWidgetActions();
    return (
        <>
            <div >
                <div className="snbex:flex snbex:items-center snbex:gap-2 snbex:mb-2">
                    <Globe2 className="snbex:w-6 snbex:h-6" />
                    <div className="snbex:text-lg snbex:font-bold">
                        Website Ready
                    </div>
                </div>
                <div className="snbex:text-sm snbex:font-medium snbex:text-background snbex:mb-4">
                    Ready to track your time spent across <span className="snbex:font-bold">{widgetState.domain}</span>
                </div>
                <Button className='snbex:bg-accent snbex:w-full' onClick={() => defaultOpenAlwaysTrackQuestion()}>
                    Track This!
                </Button>
            </div>
            {renderDebugInfo?.()}
        </>
    );
};
