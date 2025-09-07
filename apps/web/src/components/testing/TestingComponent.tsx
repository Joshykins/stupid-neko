"use client";

import { Authenticated, useMutation, useQuery } from "convex/react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { ArrowLeftToLine, ArrowRightSquare, ArrowRightToLine, Car, ClockAlert, X, Cog } from "lucide-react";
import { useState } from "react";
import dayjs from "dayjs";
import { api } from "../../../../../convex/_generated/api";
import { Slider } from "../ui/slider";
// Removed numeric inputs in favor of simple presets

export const TestingComponent = () => {
    const isEnabled = process.env.NEXT_PUBLIC_DANGEROUS_TESTING === "enabled";
    const devDate = useQuery(api.devOnlyFunctions.getDevDate, {});
    const stepDevDate = useMutation(api.devOnlyFunctions.stepDevDate);
    const reset = useMutation(api.devOnlyFunctions.resetMyDevState);
    const [showSettings, setShowSettings] = useState(true);

    const [manualProb, setManualProb] = useState<number>(25);
    const [youtubeProb, setYoutubeProb] = useState<number>(25);
    const [spotifyProb, setSpotifyProb] = useState<number>(25);
    const [ankiProb, setAnkiProb] = useState<number>(25);
    // Presets for seeding volume and duration (items as a range)
    const PRESETS = {
        light: { label: "Light day", itemsMin: 2, itemsMax: 4, min: 5, max: 20 },
        typical: { label: "Typical day", itemsMin: 5, itemsMax: 8, min: 10, max: 45 },
        super: { label: "Super day", itemsMin: 10, itemsMax: 16, min: 20, max: 90 },
    } as const;
    const [preset, setPreset] = useState<keyof typeof PRESETS>("typical");

    const sum = manualProb + youtubeProb + spotifyProb + ankiProb;
    const safeSum = sum > 0 ? sum : 1;
    const pct = (v: number) => Math.round((v / safeSum) * 100);

    if (!isEnabled) return null;

    return (
        <>
            <Authenticated>
                <div className="fixed bottom-4 right-4 z-10 flex flex-col  gap-2 items-end">
                    {showSettings && (
                        <>
                            <Card className="w-80 px-2 py-2">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold">Seed Settings</p>
                                    <Button size="sm" variant="neutral" onClick={() => setShowSettings(false)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <div className="flex flex-col gap-1">
                                        <p className="text-xs">Manual Probability ({pct(manualProb)}%)</p>
                                        <Slider mainColor="var(--color-source-misc)" value={[manualProb]} onValueChange={(v) => setManualProb(v[0] ?? 0)} />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-xs">Youtube Probability ({pct(youtubeProb)}%)</p>
                                        <Slider mainColor="var(--color-source-youtube)" value={[youtubeProb]} onValueChange={(v) => setYoutubeProb(v[0] ?? 0)} />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-xs">Spotify Probability ({pct(spotifyProb)}%)</p>
                                        <Slider mainColor="var(--color-source-spotify)" value={[spotifyProb]} onValueChange={(v) => setSpotifyProb(v[0] ?? 0)} />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <p className="text-xs">Anki Probability ({pct(ankiProb)}%)</p>
                                        <Slider mainColor="var(--color-source-anki)" value={[ankiProb]} onValueChange={(v) => setAnkiProb(v[0] ?? 0)} />
                                    </div>
                                    <div className="flex flex-col gap-2 pt-1">
                                        <p className="text-xs font-bold">Preset</p>
                                        <div className="flex flex-wrap items-center gap-1">
                                            {Object.entries(PRESETS).map(([key, p]) => (
                                                <Button
                                                    key={key}
                                                    size="sm"
                                                    className="whitespace-nowrap"
                                                    variant={preset === (key as keyof typeof PRESETS) ? "devOnly" : "neutral"}
                                                    onClick={() => setPreset(key as keyof typeof PRESETS)}
                                                >
                                                    {p.label}
                                                </Button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-muted-foreground">Items: {PRESETS[preset].itemsMin}-{PRESETS[preset].itemsMax}, Minutes: {PRESETS[preset].min}-{PRESETS[preset].max}</p>
                                    </div>
                                </div>
                            </Card>
                        </>
                    )}
                    <Card className="flex flex-col gap-2 p-2">

                        <div className="flex gap-2">
                            <Button
                                variant={"destructive"}
                                className="bg-red-400 mr-8 rounded-full"
                                onClick={async () => {
                                    const ok = window.confirm("This will delete all tracking data, experience, streaks, and reset the day to today. Proceed?");
                                    if (!ok) return;
                                    await reset({});
                                }}
                            >
                                {/* Reset */}
                                <ClockAlert />
                            </Button>
                            <Card className="px-2 py-1 text-black">
                                <p className="text-right"> {devDate && dayjs(devDate).format("MMM DD, YYYY") || "No-Date"}</p>
                            </Card>

                            <Button
                                variant={"devOnly"}
                                onClick={async () => {
                                    const cfg = PRESETS[preset];
                                    const randomInt = (lo: number, hi: number) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
                                    const items = randomInt(cfg.itemsMin, cfg.itemsMax);
                                    await stepDevDate({
                                        days: 1,
                                        seedEachStep: true,
                                        seedPerStepCount: items,
                                        seedMinMinutes: cfg.min,
                                        seedMaxMinutes: cfg.max,
                                        probManual: manualProb,
                                        probYoutube: youtubeProb,
                                        probSpotify: spotifyProb,
                                        probAnki: ankiProb,
                                    });
                                }}
                            >
                                Next Day <ArrowRightToLine />
                            </Button>
                            <Button variant={"neutral"} onClick={() => setShowSettings((s) => !s)}>
                                <Cog className="h-4 w-4" />
                            </Button>
                        </div>
                    </Card></div>
            </Authenticated >
        </>
    );
};