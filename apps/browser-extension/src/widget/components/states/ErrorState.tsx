import React from 'react';
import { Button } from '../../../components/ui/button';
import type { WidgetState } from '../../../pages/background/providers/types';

interface ErrorStateProps {
    widgetState: WidgetState;
    retry: () => void;
    renderDebugInfo?: () => React.ReactNode;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
    widgetState,
    retry,
    renderDebugInfo,
}) => {
    return (
        <>
            <div className="snbex:mt-3 snbex:text-center">
                <div className="snbex:text-lg snbex:font-bold snbex:mb-2 snbex:text-red-600">
                    Error
                </div>
                <div className="snbex:text-sm snbex:text-gray-600 snbex:mb-4">
                    {widgetState.error || 'Something went wrong'}
                </div>
                <Button
                    onClick={retry}
                    className="snbex:bg-blue-600 snbex:hover:bg-blue-700"
                    size="sm"
                >
                    Retry
                </Button>
            </div>
            {renderDebugInfo?.()}
        </>
    );
};
