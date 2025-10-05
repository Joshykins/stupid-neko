import React from 'react';
import { Button } from '../../../components/ui/button';
import type { WidgetState } from '../../../pages/background/providers/types';
import { useWidgetActions } from '../../hooks/useWidgetActions';

interface Props {
    widgetState: WidgetState;
    renderDebugInfo?: () => React.ReactNode;
}

export const DefaultProviderAlwaysTrackQuestion: React.FC<Props> = ({
    widgetState,
    renderDebugInfo,
}) => {
    const { defaultQuestionTrackOnce, defaultQuestionAlwaysTrack } = useWidgetActions();
    return (
        <>
            <div >
                <div className="snbex:text-lg snbex:font-bold snbex:mb-2">Track this site?</div>
                <div className="snbex:text-sm snbex:mb-4">Choose how you want to track</div>
                <div className="snbex:flex snbex:gap-2">
                    <Button size="sm" onClick={defaultQuestionTrackOnce}>Just this time</Button>
                    <Button size="sm" className="snbex:bg-orange-600 snbex:hover:bg-orange-700" onClick={defaultQuestionAlwaysTrack}>Always track</Button>
                </div>
            </div>
            {renderDebugInfo?.()}
        </>
    );
};


