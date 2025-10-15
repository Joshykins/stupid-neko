import React from 'react';
import { Button } from '../../../components/ui/button';
import type { WidgetState } from '../../../pages/background/providers/types';
import { useWidgetActions } from '../../hooks/useWidgetActions';
import { Globe2 } from 'lucide-react';

interface Props {
    widgetState: WidgetState;
    renderDebugInfo?: () => React.ReactNode;
}

export const WebsiteProviderAlwaysTrackQuestion: React.FC<Props> = ({
    widgetState,
    renderDebugInfo,
}) => {
    const { defaultQuestionTrackOnce, defaultQuestionAlwaysTrack } = useWidgetActions();
    return (
        <>
            <div >
                <div className="snbex:flex snbex:items-center snbex:gap-2 snbex:mb-2">
                    <Globe2 className="snbex:w-6 snbex:h-6" />
                    <div className="snbex:text-lg snbex:font-bold">
                        Track this site?
                    </div>
                </div>
                <div className="snbex:text-sm snbex:font-medium snbex:text-background snbex:mb-4">Do you want to track your time across <span className="snbex:font-bold">{widgetState.domain}</span> automatically or just this time?</div>
                <div className="snbex:grid snbex:grid-cols-2 snbex:gap-2">
                    <Button variant={'neutral'} className="snbex:bg-accent snbex:text-white snbex:col-span-1 " onClick={defaultQuestionAlwaysTrack}>Always track</Button>
                    <Button variant={'neutral'} className="snbex:col-span-1" onClick={defaultQuestionTrackOnce}>Just this time</Button>
                </div>
            </div>
            {renderDebugInfo?.()}
        </>
    );
};

