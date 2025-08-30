"use client";
import * as React from "react";
import Link from "next/link";
import { Check, Rocket } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

function Yes() {
    return (
        <span className="inline-flex w-6 h-6 items-center justify-center rounded-sm border-2 border-black bg-emerald-400 text-background shadow-[2px_2px_0_0_#000]">
            <Check size={14} strokeWidth={3} />
        </span>
    );
}

function No() {
    return (
        <span className="inline-flex w-6 h-6 items-center justify-center rounded-sm border-2 border-black bg-muted shadow-[2px_2px_0_0_#000] text-sm">
            —
        </span>
    );
}

const FEATURES: Array<{
    id: string;
    title: string;
    description: string;
}> = [
        {
            id: "connect",
            title: "Connect your apps",
            description:
                "Anki, YouTube, Spotify, and more. We tag and dedupe.",
        },
        {
            id: "add-yourself",
            title: "Add it yourself (fast)",
            description:
                "Log sessions, vocab, or notes in a few taps. Works offline.",
        },
        {
            id: "auto-track",
            title: "We track it for you",
            description:
                "Minutes, reviews, words, listening, streaks. Weekly summary.",
        },
        {
            id: "share",
            title: "Share your progress",
            description:
                "Share a public stats link with friends or your group.",
        },
        {
            id: "celebrate",
            title: "Celebrate wins",
            description:
                "Hit milestones? We create‑memes and post to the StupidNeko Discord.",
        },
        {
            id: "leaderboards",
            title: "Leaderboards",
            description:
                "Rank with friends and worldwide. Resets weekly.",
        },
    ];

const FREE_ENABLED = new Set<string>(["add-yourself", "share", "leaderboards"]);

export default function Pricing() {
    return (
        <section>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                {/* Free plan */}
                <Card className="p-6">
                    <CardHeader className="p-0">
                        <CardTitle className="font-display text-3xl font-black flex items-center justify-between"><span>StupidNeko Free</span>

                            <div className="flex items-center gap-3 text-2xl font-display font-black">
                                <span>$0.00</span>
                            </div>

                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 ">
                        <ul className="mt-4 divide-y-2 divide-border border-2 border-border rounded-lg overflow-hidden">
                            {FEATURES.slice()
                                .sort((a, b) => Number(FREE_ENABLED.has(b.id)) - Number(FREE_ENABLED.has(a.id)))
                                .map((f) => (
                                    <li key={f.id} className="grid grid-cols-[1fr_auto] items-center px-4 py-3 odd:bg-secondary-background bg-foreground">
                                        <div>
                                            <div className="font-bold">{f.title}</div>
                                            <div className="text-sm text-muted-foreground">{f.description}</div>
                                        </div>
                                        {FREE_ENABLED.has(f.id) ? <Yes /> : <No />}
                                    </li>
                                ))}
                        </ul>
                        <div className="mt-5">
                            <Button asChild size="lg" variant="neutral" className="w-full no-underline">
                                <Link href="/start?plan=free">Get started</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Pro plan */}
                <Card className="p-6">
                    <CardHeader className="p-0">

                        <CardTitle className="font-display text-3xl font-black flex items-center justify-between"><span>
                            StupidNeko <Badge><Rocket size={14} /> Pro</Badge></span> <div className="flex items-center text-2xl gap-3">
                                <span className="text-muted-foreground line-through font-bold">$19.99/mo</span>
                                <span className="relative inline-flex items-center px-2 py-1 bg-background text-foreground border-2 border-border rounded-sm  font-black">
                                    $15.99/mo
                                    <Badge variant={"neutral"} className="absolute -top-4.5 -right-6 rotate-6">Launch deal</Badge>
                                </span>
                            </div></CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 mt-2">
                        <ul className="mt-4 divide-y-2 divide-border border-2 border-border rounded-lg overflow-hidden">
                            {FEATURES.map((f) => (
                                <li key={f.id} className="grid grid-cols-[1fr_auto] items-center px-4 py-3 odd:bg-secondary-background bg-foreground">
                                    <div>
                                        <div className="font-bold">{f.title}</div>
                                        <div className="text-sm text-muted-foreground">{f.description}</div>
                                    </div>
                                    <Yes />
                                </li>
                            ))}
                        </ul>
                        <div className="mt-5">
                            <Button asChild size="lg" className="w-full no-underline">
                                <Link href="/start?plan=pro">Upgrade</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </section >
    );
}


