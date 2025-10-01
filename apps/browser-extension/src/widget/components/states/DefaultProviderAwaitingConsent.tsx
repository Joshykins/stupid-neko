import React from 'react';
import { Button } from '../../../components/ui/button';
import type { WidgetState } from '../../../pages/background/providers/types';

interface DefaultProviderAwaitingConsentProps {
    widgetState: WidgetState;
    sendConsentResponse: (consent: boolean) => void;
    renderDebugInfo?: () => React.ReactNode;
}

export const DefaultProviderAwaitingConsent: React.FC<DefaultProviderAwaitingConsentProps> = ({
    widgetState,
    sendConsentResponse,
    renderDebugInfo,
}) => {
    return (
        <>
            <div className="snbex:mt-3">
                <div className="snbex:text-lg snbex:font-bold snbex:mb-3 snbex:text-center">
                    Content Tracking Consent
                </div>
                <div className="snbex:text-sm snbex:mb-4 snbex:text-center">
                    Allow tracking of content on <strong>{widgetState.domain}</strong>
                    ?
                </div>
                {widgetState.metadata?.title && (
                    <div className="snbex:text-xs snbex:text-gray-500 snbex:mb-4 snbex:text-center">
                        {String(widgetState.metadata.title)}
                    </div>
                )}
                <div className="snbex:flex snbex:gap-2 snbex:justify-center">
                    <Button
                        onClick={() => sendConsentResponse(true)}
                        className="snbex:bg-blue-600 snbex:hover:bg-blue-700"
                        size="sm"
                    >
                        Allow
                    </Button>
                    <Button
                        onClick={() => sendConsentResponse(false)}
                        variant="neutral"
                        size="sm"
                    >
                        Deny
                    </Button>
                </div>
            </div>
            {renderDebugInfo?.()}
        </>
    );
};
