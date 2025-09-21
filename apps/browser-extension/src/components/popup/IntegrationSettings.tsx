import { useState, useEffect } from "react";
import { Loader2, Copy, ExternalLink } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useIntegrationKey } from "../hooks/useIntegrationKey";

interface IntegrationSettingsProps {
    onSaveSuccess?: () => void;
}

export function IntegrationSettings({ onSaveSuccess }: IntegrationSettingsProps) {
    const integrationKey = useIntegrationKey();
    const [inputValue, setInputValue] = useState("");
    const [copied, setCopied] = useState(false);

    // Initialize input with saved integration key
    useEffect(() => {
        if (integrationKey.integrationId) {
            setInputValue(integrationKey.integrationId);
        }
    }, [integrationKey.integrationId]);

    const handleSave = async () => {
        const success = await integrationKey.saveKey(inputValue);
        if (success) {
            // Redirect immediately without showing success message
            onSaveSuccess?.();
        }
    };

    const handleCopy = async () => {
        if (!integrationKey.integrationId) return;
        try {
            await navigator.clipboard.writeText(integrationKey.integrationId);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (error) {
            console.error("Failed to copy:", error);
        }
    };

    // Show setup flow if no integration key is set
    if (!integrationKey.hasKey) {
        return (
            <div className="mt-2 w-full px-4 py-2">
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-lg font-semibold mb-2">To get started...</h2>
                        <p className="text-sm text-gray-600">
                            Connect your browser extension to start tracking your learning activity automatically.
                        </p>
                    </div>

                    {/* Step 1: Copy Integration Key */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-sm">Step 1: Copy Your Integration Key</h3>
                        <div className="p-4 rounded-lg bg-gray-50 border">
                            <p className="text-sm text-gray-600 mb-3">
                                Copy this key from your{" "}
                                <a
                                    href="https://stupidneko.com/dashboard"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline text-blue-700 hover:text-blue-900"
                                >
                                    dashboard
                                </a>{" "}
                                and paste it below.
                            </p>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Input
                                        readOnly
                                        value={integrationKey.integrationId || "Not generated yet"}
                                        className="pr-10"
                                        onClick={(e) => {
                                            const input = e.currentTarget as HTMLInputElement;
                                            input.select();
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 cursor-pointer transition-colors duration-150 disabled:opacity-50"
                                        onClick={handleCopy}
                                        disabled={!integrationKey.integrationId}
                                        aria-label="Copy integration key"
                                        title="Copy"
                                    >
                                        <Copy className="size-4" />
                                    </button>
                                    {copied && (
                                        <div className="absolute right-2 -top-7 rounded bg-white border px-2 py-1 text-xs text-gray-900 shadow-sm">
                                            Copied
                                        </div>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => window.open('https://stupidneko.com/dashboard', '_blank')}
                                    disabled={false}
                                    size="sm"
                                >
                                    Open Dashboard
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Paste in Extension */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-sm">Step 2: Paste Key in Extension</h3>
                        <div className="p-4 rounded-lg bg-gray-50 border">
                            <p className="text-sm text-gray-600">
                                Paste the integration key in the input field above and click "Set" to establish the connection.
                                Once connected, you'll see your profile and can start tracking your learning activity!
                            </p>
                        </div>
                    </div>

                    {/* Help Link */}
                    <div className="text-center">
                        <Button
                            variant="neutral"
                            size="sm"
                            onClick={() => window.open('https://stupidneko.com/dashboard', '_blank')}
                            className="gap-2"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Open Dashboard
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-base font-semibold">
                Browser Integration
            </h2>
            <p className="mt-1 text-xs text-gray-600">
                Update your Integration ID from your{" "}
                <a
                    href="https://stupidneko.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-700 hover:text-blue-900"
                >
                    dashboard
                </a>{" "}
                if needed.
            </p>
            <div className="mt-3 flex items-center gap-2">
                <Input
                    placeholder="sn_int_..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={integrationKey.saving}
                />
                <Button
                    onClick={handleSave}
                    disabled={integrationKey.saving || !inputValue.trim()}
                >
                    {integrationKey.saving ? (
                        <span className="inline-flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                        </span>
                    ) : (
                        "Set"
                    )}
                </Button>
            </div>
            {integrationKey.error && (
                <div className="mt-2 text-xs text-red-600">
                    {integrationKey.error}
                </div>
            )}
        </div>
    );
}
