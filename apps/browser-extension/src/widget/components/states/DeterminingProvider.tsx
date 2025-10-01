import React from 'react';
import type { WidgetState } from '../../../pages/background/providers/types';

interface DeterminingProviderProps {
    widgetState: WidgetState;
    renderDebugInfo?: () => React.ReactNode;
}

export const DeterminingProvider: React.FC<DeterminingProviderProps> = ({
    widgetState,
    renderDebugInfo,
}) => {
    return (
        <>
            <div className="snbex:mt-3 snbex:text-center">
                <div className="snbex:flex snbex:items-center snbex:justify-center snbex:gap-2 snbex:mb-2">
                    <div className="snbex:w-4 snbex:h-4 snbex:border-2 snbex:border-gray-300 snbex:border-t-blue-600 snbex:rounded-full snbex:animate-spin"></div>
                    <div className="snbex:text-lg snbex:font-bold">
                        Determining Provider
                    </div>
                </div>
                <div className="snbex:text-sm snbex:text-gray-600 snbex:mb-4">
                    Analyzing content to determine the best tracking method
                </div>
                {widgetState.domain && (
                    <div className="snbex:text-xs snbex:text-gray-500 snbex:mb-4">
                        {widgetState.domain}
                    </div>
                )}
            </div>
            {renderDebugInfo?.()}
        </>
    );
};
