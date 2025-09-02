"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { LanguageCode } from "../../../../../convex/schema";
import { ScrollArea } from "../ui/scroll-area";

type DisplayItem = { id: string; title: string; minutes: number; source?: string; sourceKey?: "youtube" | "spotify" | "anki" | "manual"; date: string; occurredAt?: number; description?: string; language?: string; contentCategories?: Array<string>; skillCategories?: Array<string>; };

type TrackedItemResult = {
    _id: string;
    _creationTime: number;
    userId: string;
    source?: "youtube" | "spotify" | "anki" | "manual";
    contentCategories?: Array<"audio" | "video" | "text" | "other">;
    skillCategories?: Array<"listening" | "reading" | "speaking" | "writing">;
    isManuallyTracked?: boolean;
    languageCode?: LanguageCode;
    title?: string;
    description?: string;
    durationInSeconds?: number;
    occurredAt?: number;
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

export default function TrackedHistoryCard() {
    const data = useQuery(api.myFunctions.listRecentTrackedItems, { limit: 20 });
    const [expandedId, setExpandedId] = React.useState<string | null>(null);

    const items: Array<DisplayItem> = React.useMemo(() => {
        if (!data) return [];
        return data.map((doc: TrackedItemResult) => {
            const minutes = Math.max(0, Math.round((doc.durationInSeconds ?? 0) / 60));
            const occurredAt = doc.occurredAt ?? doc._creationTime;
            return {
                id: doc._id,
                title: doc.title ?? "(untitled)",
                minutes,
                source: capitalize(doc.source),
                sourceKey: doc.source ?? "manual",
                date: humanDate(occurredAt),
                occurredAt,
                description: doc.description,
                language: doc.languageCode,
                contentCategories: doc.contentCategories,
                skillCategories: doc.skillCategories,
            } as DisplayItem;
        });
    }, [data]);

    const SOURCE_STYLES: Record<string, { dot: string; border: string; badge: string; }> = React.useMemo(() => ({
        youtube: { dot: "bg-red-500", border: "border-red-500", badge: "text-red-600 bg-red-600/10" },
        spotify: { dot: "bg-green-500", border: "border-green-500", badge: "text-green-600 bg-green-600/10" },
        anki: { dot: "bg-indigo-500", border: "border-indigo-500", badge: "text-indigo-600 bg-indigo-600/10" },
        manual: { dot: "bg-slate-400", border: "border-slate-400", badge: "text-slate-600 bg-slate-600/10" },
    }), []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Recent tracked items</CardTitle>
            </CardHeader>
            <CardContent>
                {!data && (
                    <div className="text-sm text-muted-foreground">Loading…</div>
                )}
                {data && items.length === 0 && (
                    <div className="text-sm text-muted-foreground">No tracked items yet.</div>
                )}
                {items.length > 0 && (
                    <ScrollArea className="max-h-[420px]">
                        <ul className="space-y-2 p-1">
                            {items.map((i) => {
                                const isExpanded = expandedId === i.id;
                                const key = i.sourceKey ?? "manual";
                                const styles = SOURCE_STYLES[key] ?? SOURCE_STYLES.manual;
                                return (
                                    <li key={i.id} className={`flex flex-col gap-2 rounded-lg p-0 border border-border ${styles.border}`}>
                                        <button
                                            type="button"
                                            onClick={() => setExpandedId(isExpanded ? null : i.id)}
                                            aria-expanded={isExpanded}
                                            className="w-full text-left flex items-start justify-between gap-3 rounded-lg p-3 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                                        >
                                            <div className="flex items-start gap-3 min-w-0">
                                                <span className={`mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 ${styles.dot}`}></span>
                                                <div className="min-w-0">
                                                    <div className="font-medium truncate">{i.title}</div>
                                                    <div className="text-xs text-muted-foreground truncate">
                                                        <span className={`mr-2 rounded px-1.5 py-0.5 ${styles.badge}`}>{i.source || "Manual"}</span>
                                                        {i.date}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <div className="text-sm font-semibold text-main-foreground whitespace-nowrap">{i.minutes} min</div>
                                                <span className="text-muted-foreground text-lg leading-none" aria-hidden>
                                                    {isExpanded ? "▾" : "▸"}
                                                </span>
                                            </div>
                                        </button>
                                        {isExpanded && (
                                            <div className="text-sm grid gap-2 px-3 pb-3">
                                                {i.description && (
                                                    <p className="text-main-foreground/90">{i.description}</p>
                                                )}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-muted-foreground">
                                                    <div><span className="font-medium text-main-foreground">When:</span> {i.occurredAt ? new Date(i.occurredAt).toLocaleString() : "—"}</div>
                                                    <div><span className="font-medium text-main-foreground">Language:</span> {i.language ?? "—"}</div>
                                                    <div><span className="font-medium text-main-foreground">Content:</span> {i.contentCategories && i.contentCategories.length > 0 ? i.contentCategories.map(capitalize).join(", ") : "—"}</div>
                                                    <div><span className="font-medium text-main-foreground">Skills:</span> {i.skillCategories && i.skillCategories.length > 0 ? i.skillCategories.map(capitalize).join(", ") : "—"}</div>
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}


