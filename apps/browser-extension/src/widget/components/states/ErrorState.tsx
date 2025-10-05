import React from 'react';
import { Button } from '../../../components/ui/button';
import type { WidgetState } from '../../../pages/background/providers/types';

interface ErrorStateProps {
    widgetState: WidgetState;
    renderDebugInfo?: () => React.ReactNode;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
    widgetState,
    renderDebugInfo,
}) => {
    return (
        <>
            <div >
                <div className="snbex:text-lg snbex:font-bold snbex:mb-2 snbex:text-red-600">
                    Error
                </div>
                <div className="snbex:text-sm snbex:text-gray-600 snbex:mb-4">
                    {widgetState.error || 'Something went wrong'}
                </div>
                <div className="snbex:text-xs snbex:text-gray-500">Please refresh the page.</div>
            </div>
            {renderDebugInfo?.()}
        </>
    );
};
