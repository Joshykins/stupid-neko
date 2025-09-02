"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";

type Integration = {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
};

const DEFAULTS: Array<Integration> = [
    { id: "anki", name: "Anki", description: "Auto-import reviews and new cards.", enabled: true },
    { id: "youtube", name: "YouTube", description: "Track watch time from learning channels.", enabled: false },
    { id: "spotify", name: "Spotify", description: "Log listening practice automatically.", enabled: false },
];

export default function IntegrationsCard() {
    const [items, setItems] = React.useState<Array<Integration>>(DEFAULTS);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Integrations</CardTitle>
                <CardDescription>Turn on integrations to auto-track your activity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {items.map((i) => (
                    <div key={i.id} className="flex items-center justify-between gap-4">
                        <div>
                            <Label className="font-medium">{i.name}</Label>
                            <div className="text-xs text-muted-foreground">{i.description}</div>
                        </div>
                        <Switch checked={i.enabled} onCheckedChange={(v) => setItems((prev) => prev.map((p) => (p.id === i.id ? { ...p, enabled: v } : p)))} />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}


