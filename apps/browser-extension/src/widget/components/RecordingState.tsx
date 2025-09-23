import type React from "react";
import { widgetStateManager } from "../WidgetStateManager";
import type { WidgetState } from "../../pages/background/providers/types";

interface RecordingStateProps {
    state: WidgetState;
}

export const RecordingState: React.FC<RecordingStateProps> = ({ state }) => {
    const handleStop = () => {
        widgetStateManager.sendAction("stop-recording");
    };

    const getProviderIcon = (provider: string) => {
        switch (provider) {
            case "youtube":
                return (
                    <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="currentColor" aria-label="YouTube icon">
                        <title>YouTube icon</title>
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                );
            case "default":
                return (
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Website icon">
                        <title>Website icon</title>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                    </svg>
                );
            default:
                return (
                    <div className="w-5 h-5 rounded-full bg-gray-400"></div>
                );
        }
    };

    const getProviderName = (provider: string) => {
        switch (provider) {
            case "youtube":
                return "YouTube";
            case "default":
                return "Website";
            default:
                return provider;
        }
    };

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    {getProviderIcon(state.provider || "default")}
                    <div>
                        <p className="text-sm font-medium text-gray-900" title={`Recording ${getProviderName(state.provider || "default")}`}>
                            Recording {getProviderName(state.provider || "default")}
                        </p>
                        <p className="text-xs text-gray-500">
                            {state.domain}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-500" title="Live recording">LIVE</span>
                </div>
            </div>

            {state.metadata?.title && (
                <div className="mb-3 p-2 bg-gray-50 rounded-md">
                    <p className="text-xs text-gray-600 truncate">
                        {state.metadata.title}
                    </p>
                </div>
            )}

            <button
                type="button"
                onClick={handleStop}
                className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
                Stop Recording
            </button>
        </div>
    );
};
