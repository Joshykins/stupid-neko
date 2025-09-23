import type React from "react";
import type { WidgetState } from "../../../pages/background/providers/types";
import { widgetStateManager } from "../WidgetStateManager";

interface ErrorStateProps {
    state: WidgetState;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ state }) => {
    const handleRetry = () => {
        widgetStateManager.sendAction("retry");
    };

    return (
        <div className="p-4">
            <div className="text-center mb-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Error icon">
                        <title>Error icon</title>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2" title="Error">
                    Error
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                    {state.error || "Something went wrong"}
                </p>
            </div>

            <button
                type="button"
                onClick={handleRetry}
                className="w-full px-3 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
                Try Again
            </button>
        </div>
    );
};
