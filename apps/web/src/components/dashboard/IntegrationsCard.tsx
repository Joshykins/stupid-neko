"use client";

import { useMutation, useQuery } from "convex/react";
import * as React from "react";
import { PlugZap, Copy, ExternalLink } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import Image from "next/image";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";

type Integration = {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
};

const DEFAULTS: Array<Integration> = [
    {
        id: "browser",
        name: "Browser Extension",
        description: "Track web activity automatically.",
        enabled: false,
    },
    {
        id: "spotify",
        name: "Spotify",
        description: "Log listening practice automatically.",
        enabled: false,
    },
    // {
    //     id: "anki",
    //     name: "Anki",
    //     description: "Auto-import reviews and new cards.",
    //     enabled: true,
    // },
    // {
    //     id: "youtube",
    //     name: "YouTube",
    //     description: "Track watch time from learning channels.",
    //     enabled: false,
    // },
];

export default function IntegrationsCard() {
    const [items, setItems] = React.useState<Array<Integration>>(DEFAULTS);
    const status = useQuery(api.spotifyFunctions.getStatus, {});
    const start = useMutation(api.spotifyFunctions.startAuth);
    const disconnect = useMutation(api.spotifyFunctions.disconnect);
    const integrationKey = useQuery(api.integrationKeyFunctions.getIntegrationKey);
    const regenerateIntegrationKey = useMutation(api.integrationKeyFunctions.regenerateIntegrationKey);
    const clearIntegrationKey = useMutation(api.integrationKeyFunctions.clearIntegrationKey);
    const [pending, setPending] = React.useState<{
        action: "enable" | "disable";
        item: Integration;
    } | null>(null);
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [infoOpen, setInfoOpen] = React.useState(false);
    const [browserGuideOpen, setBrowserGuideOpen] = React.useState(false);
    const [browserManageOpen, setBrowserManageOpen] = React.useState(false);
    const [copied, setCopied] = React.useState(false);

    const COLORS: Record<string, string> = {
        browser: "var(--color-source-misc)",
        youtube: "var(--color-source-youtube)",
        spotify: "var(--color-source-spotify)",
        anki: "var(--color-source-anki)",
    };

    const getBrandIcon = (id: string) => {
        switch (id) {
            case "browser":
                return (
                    <Image
                        src="/brands/browser-extension.svg"
                        alt="Browser Extension"
                        width={20}
                        height={20}
                        className="w-8 h-8"
                    />
                );
            case "spotify":
                return (
                    <Image
                        src="/brands/spotify.svg"
                        alt="Spotify"
                        width={20}
                        height={20}
                        className="w-7 h-7"
                    />
                );
            case "youtube":
                return (
                    <div className="w-5 h-5 rounded-sm bg-red-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">YT</span>
                    </div>
                );
            case "anki":
                return (
                    <div className="w-5 h-5 rounded-sm bg-blue-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">A</span>
                    </div>
                );
            default:
                return null;
        }
    };

    function toggleWithDialogs(item: Integration, next: boolean) {
        if (next) {
            if (item.id === "browser") {
                setPending({ action: "enable", item });
                setBrowserGuideOpen(true);
            } else {
                setPending({ action: "enable", item });
                setInfoOpen(true);
            }
        } else {
            if (item.id === "browser" && isBrowserExtensionConnected) {
                // For connected browser extension, show management dialog instead of disable confirmation
                setPending({ action: "disable", item });
                setBrowserManageOpen(true);
            } else {
                setPending({ action: "disable", item });
                setConfirmOpen(true);
            }
        }
    }

    // Keep Spotify toggle in sync with backend connection status
    React.useEffect(() => {
        if (typeof status?.connected === "boolean") {
            setItems((prev) =>
                prev.map((p) =>
                    p.id === "spotify" ? { ...p, enabled: !!status.connected } : p,
                ),
            );
        }
    }, [status?.connected]);

    // Check browser extension connection status
    const isBrowserExtensionConnected = React.useMemo(() => {
        // Browser extension is connected if there's an integration key AND it has been used by the plugin
        return !!(integrationKey?.integrationId && integrationKey?.integrationKeyUsedByPlugin);
    }, [integrationKey?.integrationId, integrationKey?.integrationKeyUsedByPlugin]);

    // Keep browser extension toggle in sync with connection status
    React.useEffect(() => {
        setItems((prev) =>
            prev.map((p) =>
                p.id === "browser" ? { ...p, enabled: isBrowserExtensionConnected } : p,
            ),
        );
    }, [isBrowserExtensionConnected]);

    // Auto-close browser guide dialog when integration key is used
    React.useEffect(() => {
        if (isBrowserExtensionConnected && browserGuideOpen) {
            setBrowserGuideOpen(false);
            setPending(null);
        }
    }, [isBrowserExtensionConnected, browserGuideOpen]);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3 pb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <PlugZap className="h-8 w-8 text-primary stroke-2" />
                    </div>
                    <div>
                        <CardTitle className="font-display text-xl font-black">
                            Integrations
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Connect services to auto-track your learning activity
                        </p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {items.map((i) => (
                    <div key={i.id} className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border/50 hover:border-border transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/50">
                                {getBrandIcon(i.id)}
                            </div>
                            <div>
                                <Label className="font-medium">{i.name}</Label>
                                <div className="text-xs text-muted-foreground">
                                    {i.id === "browser" && isBrowserExtensionConnected
                                        ? "Connected and tracking web activity"
                                        : i.id === "spotify" && status?.connected
                                            ? `Connected${status?.displayName ? ` as ${status.displayName}` : ""}`
                                            : i.description}
                                </div>
                            </div>
                        </div>
                        <Switch
                            style={
                                {
                                    "--switch-checked-bg": COLORS[i.id] ?? "var(--main)",
                                } as React.CSSProperties
                            }
                            checked={i.enabled}
                            onCheckedChange={(v) => toggleWithDialogs(i, v)}
                        />
                    </div>
                ))}

                {/* Disable confirmation dialog */}
                <Dialog
                    open={confirmOpen}
                    onOpenChange={(o) => {
                        setConfirmOpen(o);
                        if (!o) setPending(null);
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Disable {pending?.item.name}?</DialogTitle>
                            <DialogDescription>
                                This will stop auto-tracking from {pending?.item.name}. You can
                                re-enable it anytime.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                onClick={() => {
                                    // Revert switch
                                    setItems((prev) =>
                                        prev.map((p) =>
                                            p.id === pending?.item.id ? { ...p, enabled: true } : p,
                                        ),
                                    );
                                    setConfirmOpen(false);
                                    setPending(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={async () => {
                                    if (pending?.item.id === "spotify") {
                                        try {
                                            await disconnect({});
                                        } catch { }
                                    } else if (pending?.item.id === "browser") {
                                        try {
                                            await clearIntegrationKey({});
                                        } catch { }
                                    }
                                    setItems((prev) =>
                                        prev.map((p) =>
                                            p.id === pending?.item.id ? { ...p, enabled: false } : p,
                                        ),
                                    );
                                    setConfirmOpen(false);
                                    setPending(null);
                                }}
                            >
                                Disable
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Enable info dialog */}
                <Dialog
                    open={infoOpen}
                    onOpenChange={(o) => {
                        setInfoOpen(o);
                        if (!o) {
							/* revert if closed without action */ setItems((prev) =>
                            prev.map((p) =>
                                p.id === pending?.item.id ? { ...p, enabled: false } : p,
                            ),
                        );
                            setPending(null);
                        }
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Enable {pending?.item.name}</DialogTitle>
                            <DialogDescription>
                                {pending?.item.id === "spotify"
                                    ? "We’ll automatically track your listening time for your target language."
                                    : `Turn on ${pending?.item.name ?? "this integration"} to start automatic tracking.`}
                            </DialogDescription>
                        </DialogHeader>
                        {pending?.item.id === "spotify" && (
                            <div className="space-y-2 text-left text-sm">
                                <ul className="list-disc pl-5">
                                    <li>Requires Spotify login and minimal permissions.</li>
                                    <li>Only counts content matching your target language.</li>
                                    <li>You can disconnect anytime.</li>
                                </ul>
                            </div>
                        )}
                        <DialogFooter>
                            <Button
                                onClick={() => {
                                    // Cancel -> revert
                                    setItems((prev) =>
                                        prev.map((p) =>
                                            p.id === pending?.item.id ? { ...p, enabled: false } : p,
                                        ),
                                    );
                                    setInfoOpen(false);
                                    setPending(null);
                                }}
                            >
                                Not now
                            </Button>
                            {pending?.item.id === "spotify" ? (
                                <Button
                                    onClick={async () => {
                                        // Keep enabled visually and kick off OAuth
                                        setItems((prev) =>
                                            prev.map((p) =>
                                                p.id === pending?.item.id ? { ...p, enabled: true } : p,
                                            ),
                                        );
                                        setInfoOpen(false);
                                        setPending(null);
                                        const { url } = await start({});
                                        if (url) window.location.href = url;
                                    }}
                                    style={{ backgroundColor: "var(--color-source-spotify)" }}
                                >
                                    Connect Spotify
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => {
                                        setItems((prev) =>
                                            prev.map((p) =>
                                                p.id === pending?.item.id ? { ...p, enabled: true } : p,
                                            ),
                                        );
                                        setInfoOpen(false);
                                        setPending(null);
                                    }}
                                >
                                    Enable
                                </Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Browser Extension Installation Guide */}
                <Dialog
                    open={browserGuideOpen}
                    onOpenChange={(o) => {
                        setBrowserGuideOpen(o);
                        if (!o) {
                            setItems((prev) =>
                                prev.map((p) =>
                                    p.id === pending?.item.id ? { ...p, enabled: false } : p,
                                ),
                            );
                            setPending(null);
                        }
                    }}
                >
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Install Browser Extension</DialogTitle>
                            <DialogDescription>
                                Follow these steps to connect your browser extension and start tracking web activity.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* Step 1: Install Extension */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-sm">Step 1: Install the Extension</h3>
                                <div className="p-4 rounded-lg bg-muted/50 border">
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Download and install the browser extension from your browser's extension store.
                                    </p>
                                    <Button
                                        variant="neutral"
                                        size="sm"
                                        onClick={() => window.open('https://chrome.google.com/webstore', '_blank')}
                                        className="gap-2"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Open Chrome Web Store
                                    </Button>
                                </div>
                            </div>

                            {/* Step 2: Copy Integration Key */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-sm">Step 2: Copy Your Integration Key</h3>
                                <div className="p-4 rounded-lg bg-muted/50 border">
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Copy this key and paste it into the browser extension when prompted.
                                    </p>
                                    <div className="mt-3 flex items-center gap-2">
                                        <div className="relative w-full">
                                            <Input
                                                readOnly
                                                value={integrationKey?.integrationId ?? "Not generated yet"}
                                                className="pr-10"
                                                onClick={(e) => {
                                                    const input = e.currentTarget as HTMLInputElement;
                                                    input.select();
                                                }}
                                            />
                                            <button
                                                type="button"
                                                className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-base p-1 text-main-foreground/80 hover:text-main-foreground hover:bg-border/30 cursor-pointer transition-colors duration-150 disabled:opacity-50"
                                                onClick={async () => {
                                                    const key = integrationKey?.integrationId;
                                                    if (!key) return;
                                                    try {
                                                        await navigator.clipboard.writeText(key);
                                                        setCopied(true);
                                                        setTimeout(() => setCopied(false), 1500);
                                                    } catch { }
                                                }}
                                                disabled={!integrationKey?.integrationId}
                                                aria-label="Copy integration key"
                                                title="Copy"
                                            >
                                                <Copy className="size-4" />
                                            </button>
                                            {copied && (
                                                <div className="absolute right-2 -top-7 rounded-base bg-secondary-background border-2 border-border px-2 py-1 text-xs text-main-foreground shadow-sm">
                                                    Copied
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={async () => {
                                                try {
                                                    await regenerateIntegrationKey({});
                                                } catch { }
                                            }}
                                        >
                                            {integrationKey?.integrationId
                                                ? "Regenerate"
                                                : "Generate"}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Step 3: Connect */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-sm">Step 3: Connect in Extension</h3>
                                <div className="p-4 rounded-lg bg-muted/50 border">
                                    <p className="text-sm text-muted-foreground">
                                        Open the extension popup and paste your integration key to establish the connection.
                                        The toggle will automatically enable once connected.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                variant="neutral"
                                onClick={() => {
                                    setItems((prev) =>
                                        prev.map((p) =>
                                            p.id === pending?.item.id ? { ...p, enabled: false } : p,
                                        ),
                                    );
                                    setBrowserGuideOpen(false);
                                    setPending(null);
                                }}
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Browser Extension Management Dialog */}
                <Dialog
                    open={browserManageOpen}
                    onOpenChange={(o) => {
                        setBrowserManageOpen(o);
                        if (!o) setPending(null);
                    }}
                >
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Manage Browser Extension</DialogTitle>
                            <DialogDescription>
                                <div className="space-y-3">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                                        <span className="text-xs p-0 font-medium text-background">
                                            Connected and tracking web activity
                                        </span>
                                    </div>
                                </div>
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* Integration Key Section */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-sm">Integration Key</h3>
                                <div className="p-4 rounded-lg bg-muted/50 border">
                                    <p className="text-sm text-muted-foreground mb-3">
                                        This is your unique integration key that connects your browser extension to your account.
                                    </p>
                                    <div className="relative w-full">
                                        <Input
                                            readOnly
                                            value={integrationKey?.integrationId ?? "Not available"}
                                            className="pr-10"
                                            onClick={(e) => {
                                                const input = e.currentTarget as HTMLInputElement;
                                                input.select();
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-base p-1 text-main-foreground/80 hover:text-main-foreground hover:bg-border/30 cursor-pointer transition-colors duration-150 disabled:opacity-50"
                                            onClick={async () => {
                                                const key = integrationKey?.integrationId;
                                                if (!key) return;
                                                try {
                                                    await navigator.clipboard.writeText(key);
                                                    setCopied(true);
                                                    setTimeout(() => setCopied(false), 1500);
                                                } catch { }
                                            }}
                                            disabled={!integrationKey?.integrationId}
                                            aria-label="Copy integration key"
                                            title="Copy"
                                        >
                                            <Copy className="size-4" />
                                        </button>
                                        {copied && (
                                            <div className="absolute right-2 -top-7 rounded-base bg-secondary-background border-2 border-border px-2 py-1 text-xs text-main-foreground shadow-sm">
                                                Copied
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="flex justify-between">
                            <Button
                                variant="destructive"
                                onClick={async () => {
                                    try {
                                        await clearIntegrationKey({});
                                    } catch { }
                                    setItems((prev) =>
                                        prev.map((p) =>
                                            p.id === pending?.item.id ? { ...p, enabled: false } : p,
                                        ),
                                    );
                                    setBrowserManageOpen(false);
                                    setPending(null);
                                }}
                            >
                                Disconnect Extension
                            </Button>
                            <Button
                                variant="neutral"
                                onClick={() => {
                                    setBrowserManageOpen(false);
                                    setPending(null);
                                }}
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
}
