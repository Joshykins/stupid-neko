'use client';

import * as React from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../../../convex/_generated/api';
import Image from 'next/image';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';

export default function IntegrationForSpotify() {
    const status = useQuery(api.spotifyFunctions.getStatus, {});
    const start = useMutation(api.spotifyFunctions.startAuth);
    const disconnect = useMutation(api.spotifyFunctions.disconnect);

    const [infoOpen, setInfoOpen] = React.useState(false);
    const [confirmOpen, setConfirmOpen] = React.useState(false);

    const checked = !!status?.connected;

    return (
        <div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border/50 hover:border-border transition-colors">
            <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/50">
                    <Image src="/brands/spotify.svg" alt="Spotify" width={20} height={20} className="w-7 h-7" />
                </div>
                <div>
                    <Label className="font-medium">Spotify</Label>
                    <div className="text-xs text-muted-foreground">
                        {status?.connected
                            ? `Connected${status?.displayName ? ` as ${status.displayName}` : ''}`
                            : 'Log listening practice automatically.'}
                    </div>
                </div>
            </div>
            <Switch
                style={{ '--switch-checked-bg': 'var(--color-source-spotify)' } as React.CSSProperties}
                checked={checked}
                onCheckedChange={v => {
                    if (v) setInfoOpen(true);
                    else setConfirmOpen(true);
                }}
            />

            <Dialog
                open={infoOpen}
                onOpenChange={o => {
                    setInfoOpen(o);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enable Spotify</DialogTitle>
                        <DialogDescription>
                            We’ll automatically track your listening time for your target language.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 text-left text-sm">
                        <ul className="list-disc pl-5">
                            <li>Requires Spotify login and minimal permissions.</li>
                            <li>Only counts content matching your target language.</li>
                            <li>You can disconnect anytime.</li>
                        </ul>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setInfoOpen(false)}>Not now</Button>
                        <Button
                            onClick={async () => {
                                setInfoOpen(false);
                                const { url } = await start({});
                                if (url) window.location.href = url;
                            }}
                            style={{ backgroundColor: 'var(--color-source-spotify)' }}
                        >
                            Connect Spotify
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={confirmOpen}
                onOpenChange={o => {
                    setConfirmOpen(o);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Disable Spotify?</DialogTitle>
                        <DialogDescription>
                            This will stop auto-tracking from Spotify. You can re-enable it anytime.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={async () => {
                                try {
                                    await disconnect({});
                                } catch {
                                    // ignore errors
                                }
                                setConfirmOpen(false);
                            }}
                        >
                            Disable
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}


