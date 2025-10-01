import React from 'react';
import type { WidgetState } from '../../../pages/background/providers/types';

interface HiddenStateProps {
    widgetState: WidgetState;
    title: string;
    description?: string;
    renderDebugInfo?: () => React.ReactNode;
}

export const HiddenState: React.FC<HiddenStateProps> = ({
    widgetState,
    title,
    description,
    renderDebugInfo,
}) => {
    return (
        <>
            <div className="snbex:mt-3">
                <div className="snbex:text-lg snbex:font-bold snbex:mb-2">
                    {title}
                </div>
                {description && (
                    <div className="snbex:text-sm snbex:text-gray-600 snbex:mb-4">
                        {description}
                    </div>
                )}
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
