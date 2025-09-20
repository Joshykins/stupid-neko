"use client";

import { useMutation, useQuery } from "convex/react";
import * as React from "react";
import { api } from "../../../../../convex/_generated/api";
import { Button } from "../ui/button";
import {
    Card,
    CardContent,
    CardDescription,
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
        id: "anki",
        name: "Anki",
        description: "Auto-import reviews and new cards.",
        enabled: true,
    },
    {
        id: "youtube",
        name: "YouTube",
        description: "Track watch time from learning channels.",
        enabled: false,
    },
    {
        id: "spotify",
        name: "Spotify",
        description: "Log listening practice automatically.",
        enabled: false,
    },
];

export default function IntegrationsCard() {
    const [items, setItems] = React.useState<Array<Integration>>(DEFAULTS);
    const status = useQuery(api.spotifyFunctions.getStatus, {});
    const start = useMutation(api.spotifyFunctions.startAuth);
    const disconnect = useMutation(api.spotifyFunctions.disconnect);
    const [pending, setPending] = React.useState<{
        action: "enable" | "disable";
        item: Integration;
    } | null>(null);
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [infoOpen, setInfoOpen] = React.useState(false);

    const COLORS: Record<string, string> = {
        youtube: "var(--color-source-youtube)",
        spotify: "var(--color-source-spotify)",
        anki: "var(--color-source-anki)",
    };

    function toggleWithDialogs(item: Integration, next: boolean) {
        if (next) {
            setPending({ action: "enable", item });
            setInfoOpen(true);
        } else {
            setPending({ action: "disable", item });
            setConfirmOpen(true);
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

    return (
        <Card>
            <CardHeader>
                <CardTitle>Integrations</CardTitle>
                <CardDescription>
                    Turn on integrations to auto-track your activity.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {items.map((i) => (
                    <div key={i.id} className="flex items-center justify-between gap-4">
                        <div>
                            <Label className="font-medium">{i.name}</Label>
                            <div className="text-xs text-muted-foreground">
                                {i.id === "spotify" && status?.connected
                                    ? `Connected${status?.displayName ? ` as ${status.displayName}` : ""}`
                                    : i.description}
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
            </CardContent>
        </Card>
    );
}
