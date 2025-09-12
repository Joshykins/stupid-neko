"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { LanguageCode } from "../../../../../convex/schema";
// Avoid Radix ScrollArea here to prevent inner display: table wrapper pushing content
import { formatSeconds } from "@/lib/utils";

type DisplayItem = { id: string; title: string; minutes: number; source?: string; sourceKey?: "youtube" | "spotify" | "anki" | "manual"; date: string; occurredAt?: number; description?: string; language?: string; state?: "in-progress" | "completed"; contentKey?: string; label?: { title?: string; authorName?: string; thumbnailUrl?: string; fullDurationInSeconds?: number; contentUrl?: string; }; awardedExperience?: number; };

type LanguageActivityResult = {
    _id: string;
    _creationTime: number;
    userId: string;
    source?: "youtube" | "spotify" | "anki" | "manual";
    isManuallyTracked?: boolean;
    languageCode?: LanguageCode;
    title?: string;
    description?: string;
    durationInSeconds?: number;
    occurredAt?: number;
    state: "in-progress" | "completed";
    contentKey?: string;
    label?: { title?: string; authorName?: string; thumbnailUrl?: string; fullDurationInSeconds?: number; contentUrl?: string; };
    awardedExperience?: number;
};

function capitalize(word: string | undefined): string {
    if (!word) return "";
    return word.charAt(0).toUpperCase() + word.slice(1);
}

function humanDate(ts?: number): string {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    if (ts >= startOfToday) return "Today";
    if (ts >= startOfYesterday) return "Yesterday";
    return d.toLocaleDateString();
}

function formatTime(ts?: number): string {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).toLowerCase();
}

function dateFooterLabel(ts?: number): string {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (ts >= startOfToday) {
        return `Today at ${formatTime(ts)}`;
    }
    const dateStr = d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
    return `${dateStr}, ${formatTime(ts)}`;
}

export default function TrackedHistoryCard() {
    const data = useQuery(api.languageActivityFunctions.listRecentLanguageActivities, { limit: 20 });

    const items: Array<DisplayItem> = React.useMemo(() => {
        if (!data) return [];
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const mapped = data.map((doc: LanguageActivityResult) => {
            const minutes = Math.max(0, Math.round((doc.durationInSeconds ?? 0) / 60));
            const occurredAt = doc.occurredAt ?? doc._creationTime;
            const inferredSource = (() => {
                const key = doc.contentKey ?? "";
                if (key.startsWith("youtube:")) return "youtube" as const;
                if (key.startsWith("spotify:")) return "spotify" as const;
                if (key.startsWith("anki:")) return "anki" as const;
                return "manual" as const;
            })();
            return {
                id: doc._id,
                title: doc.title ?? doc.label?.title ?? "(untitled)",
                minutes,
                source: capitalize(inferredSource),
                sourceKey: inferredSource,
                date: humanDate(occurredAt),
                occurredAt,
                description: doc.description ?? undefined,
                language: doc.languageCode,
                state: doc.state,
                contentKey: doc.contentKey,
                label: doc.label,
                awardedExperience: doc.awardedExperience ?? 0,
            } as DisplayItem;
        });
        // Only include items from today (local time)
        const todays = mapped.filter((i) => (i.occurredAt ?? 0) >= startOfToday);
        // Prioritize in-progress first, then by occurredAt desc
        return todays.sort((a, b) => {
            const aActive = a.state === "in-progress";
            const bActive = b.state === "in-progress";
            if (aActive && !bActive) return -1;
            if (!aActive && bActive) return 1;
            return (b.occurredAt ?? 0) - (a.occurredAt ?? 0);
        });
    }, [data]);

    // Live ticking for in-progress items only (completed items are frozen)
    const [nowTick, setNowTick] = React.useState<number>(Date.now());
    React.useEffect(() => {
        const interval = setInterval(() => setNowTick(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const SOURCE_STYLES: Record<string, { dot: string; border: string; badge: string; }> = React.useMemo(() => ({
        youtube: { dot: "bg-red-500", border: "border-red-500", badge: "text-red-600 bg-red-600/10" },
        spotify: { dot: "bg-green-500", border: "border-green-500", badge: "text-green-600 bg-green-600/10" },
        anki: { dot: "bg-indigo-500", border: "border-indigo-500", badge: "text-indigo-600 bg-indigo-600/10" },
        manual: { dot: "bg-slate-400", border: "border-slate-400", badge: "text-slate-600 bg-slate-600/10" },
    }), []);

    const SOURCE_ICON: Record<string, string> = React.useMemo(() => ({
        youtube: "/brands/youtube.svg",
        spotify: "/brands/spotify.svg",
        anki: "/brands/anki.svg",
    }), []);

    // No progress bar; we only display current listened time

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                {!data && (
                    <div className="text-sm text-muted-foreground">Loading…</div>
                )}
                {data && items.length === 0 && (
                    <div className="text-sm text-muted-foreground">No tracked items yet.</div>
                )}
                {items.length > 0 && (
                    <div className="max-h-[420px] overflow-y-auto">
                        <ul className="space-y-2 p-1">
                            {items.map((i) => {
                                const key = i.sourceKey ?? "manual";
                                const styles = SOURCE_STYLES[key] ?? SOURCE_STYLES.manual;
                                const baseSeconds = Math.max(0, Math.floor((i.minutes * 60)));
                                const sinceOccured = i.state === "in-progress" ? Math.max(0, Math.floor((nowTick - (i.occurredAt ?? nowTick)) / 1000)) : 0;
                                const capped = i.label?.fullDurationInSeconds ?? undefined;
                                const liveElapsed = Math.min(baseSeconds + sinceOccured, typeof capped === "number" && capped > 0 ? capped : baseSeconds + sinceOccured);
                                return (
                                    <li key={i.id}>
                                        <div
                                            className={`group flex items-center justify-between gap-3 p-2 rounded-base transition-all border-2 bg-secondary-background text-main-foreground border-border hover:translate-x-reverseBoxShadowX hover:translate-y-reverseBoxShadowY hover:shadow-shadow !w-full`}
                                            aria-label={`${i.title} ${i.source ? `from ${i.source}` : ""}`}
                                        >
                                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                                {SOURCE_ICON[key] ? (
                                                    <img src={SOURCE_ICON[key]} alt={i.source ?? key} width={24} height={24} className="inline-block mt-0.5" />
                                                ) : (
                                                    <span className={`mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 ${styles.dot}`}></span>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-bold truncate">{i.title}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {i.label?.authorName ? `By ${i.label.authorName}` : ""}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
                                                <div className="text-xs text-muted-foreground whitespace-nowrap"><span className="font-bold font-display text-main-foreground">{i.state === "in-progress" ? "Tracking" : "Tracked"}</span> {formatSeconds(liveElapsed)}</div>
                                                <div className="text-xs text-muted-foreground whitespace-nowrap"><span className="font-bold text-main-foreground">Awarded</span> {Math.max(0, Math.floor(i.awardedExperience ?? 0))} XP</div>
                                            </div>
                                        </div>
                                        <div className="mt-1 text-[11px] text-muted-foreground text-right pr-1">{dateFooterLabel(i.occurredAt)}</div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}



