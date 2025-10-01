import React from 'react';
import { Button } from '../../../components/ui/button';
import type { WidgetState } from '../../../pages/background/providers/types';

interface DefaultProviderPromptUserProps {
    widgetState: WidgetState;
    sendConsentResponse: (consent: boolean) => void;
    renderDebugInfo?: () => React.ReactNode;
}

export const DefaultProviderPromptUser: React.FC<DefaultProviderPromptUserProps> = ({
    widgetState,
    sendConsentResponse,
    renderDebugInfo,
}) => {
    return (
        <>
            <div className="snbex:mt-3">
                <div className="snbex:text-lg snbex:font-bold snbex:mb-3 snbex:text-center">
                    Language Detected!
                </div>
                <div className="snbex:text-sm snbex:mb-4 snbex:text-center">
                    We detected content in{' '}
                    <strong>{widgetState.detectedLanguage}</strong> on{' '}
                    <strong>{widgetState.domain}</strong>
                </div>
                {widgetState.metadata?.title && (
                    <div className="snbex:text-xs snbex:text-gray-500 snbex:mb-4 snbex:text-center">
                        {String(widgetState.metadata.title)}
                    </div>
                )}
                <div className="snbex:text-sm snbex:mb-4 snbex:text-center">
                    Would you like to start tracking this content?
                </div>
                <div className="snbex:flex snbex:gap-2 snbex:justify-center">
                    <Button
                        onClick={() => sendConsentResponse(true)}
                        className="snbex:bg-green-600 snbex:hover:bg-green-700"
                        size="sm"
                    >
                        Start Tracking
                    </Button>
                    <Button
                        onClick={() => sendConsentResponse(false)}
                        variant="neutral"
                        size="sm"
                    >
                        Not Now
                    </Button>
                </div>
            </div>
            {renderDebugInfo?.()}
        </>
    );
};
