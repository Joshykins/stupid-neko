"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export function IntegrationsCard() {
    const integrations = [
        {
            name: "Spotify",
            icon: "/brands/spotify.svg",
            points: [
                "Only music in your target language (artist locale/title script).",
                "Songs you play.",
                "Artists you listen to.",
                "Minutes listened.",
            ],
        },
        {
            name: "YouTube",
            icon: "/brands/youtube.svg",
            points: [
                "Auto-tracks videos you watch.",
                "Detects the language of the video.",
                "Tracks the time watched.",
                "Experience earned for watching.",
            ],
        },
        {
            name: "Browser Plugin",
            icon: "/brands/browser-extension.svg",
            points: [
                "Auto-tracks websites you read and videos you watch.",
                "Detects the language of pages and videos.",
                "Tracks time on page.",
                "Experience earned for reading and watching.",
            ],
        },
        {
            name: "More coming soon",
            icon: "/brands/more-stars.svg",
            points: [
                "Discord, track your conversations.",
                "Spotify, track your listening.",
                "Anki, track your reviews.",
                "More coming soon...",
            ],
        }
    ];
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-display text-xl font-black">Integrations</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="grid grid-cols-1 sm:grid-cols-1 gap-2">
                    {integrations.map((i) => (
                        <li key={i.name} className="flex items-start gap-2 p-2 rounded-base transition-all border-2 border-border bg-secondary-background text-main-foreground border-border border-2 hover:translate-x-reverseBoxShadowX hover:translate-y-reverseBoxShadowY hover:shadow-shadow">
                            <img src={i.icon} alt={i.name} width={24} height={24} className="inline-block mt-0.5" />
                            <div className="flex flex-col">
                                <span className="font-bold text-sm">{i.name}</span>
                                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                                    {i.points.map((p, idx) => (
                                        <li key={`${i.name}-${idx}`} className="text-xs">{p}</li>
                                    ))}
                                </ul>
                            </div>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}