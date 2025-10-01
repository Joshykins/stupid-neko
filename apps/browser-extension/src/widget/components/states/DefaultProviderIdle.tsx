import React from 'react';
import { Button } from '../../../components/ui/button';
import type { WidgetState } from '../../../pages/background/providers/types';

interface DefaultProviderIdleProps {
    widgetState: WidgetState;
    sendConsentResponse: (consent: boolean) => void;
    renderDebugInfo?: () => React.ReactNode;
}

export const DefaultProviderIdle: React.FC<DefaultProviderIdleProps> = ({
    widgetState,
    sendConsentResponse,
    renderDebugInfo,
}) => {
    return (
        <>
            <div className="snbex:mt-3 snbex:text-center">
                <div className="snbex:flex snbex:items-center snbex:justify-center snbex:gap-2 snbex:mb-2">
                    <svg
                        className="snbex:w-5 snbex:h-5 snbex:text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-label="Website icon"
                    >
                        <title>Website icon</title>
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"
                        />
                    </svg>
                    <div className="snbex:text-lg snbex:font-bold">
                        Website Ready
                    </div>
                </div>
                <div className="snbex:text-sm snbex:text-gray-600 snbex:mb-4">
                    Ready to track content on this website
                </div>
                {widgetState.domain && (
                    <div className="snbex:text-xs snbex:text-gray-500 snbex:mb-4">
                        {widgetState.domain}
                    </div>
                )}
                <Button onClick={() => sendConsentResponse(true)} size="sm">
                    Start Tracking
                </Button>
            </div>
            {renderDebugInfo?.()}
        </>
    );
};
