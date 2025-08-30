"use client";
import * as React from "react";

function hashStringToNumber(label: string): number {
    let hash = 0;
    for (let i = 0; i < label.length; i++) {
        hash = (hash << 5) - hash + label.charCodeAt(i);
        hash |= 0;
    }
    const min = 120;
    const max = 420;
    const normalized = Math.abs(hash % (max - min + 1));
    return min + normalized;
}

export function NeobrutalTooltip(
    props: any
) {
    const { active, payload, label, fallbackColor } = props;
    if (!active || !payload || payload.length === 0) return null;

    const first = payload[0];
    const color =
        (first && (first.payload as unknown as { color?: string; })?.color) ||
        (first as unknown as { color?: string; }).color ||
        fallbackColor || "#000";

    const name = (first && (first.name as string)) || (label as string) || "";
    const fakeValue = hashStringToNumber(String(name));

    return (
        <div className="pointer-events-none select-none rounded-base border-2 border-border bg-main px-3 py-1.5 text-sm font-base text-main-foreground shadow-shadow">
            <div className="flex items-center gap-2 font-bold text-sm">
                <span className="inline-block w-3 h-3 rounded-sm border-2 border-black" style={{ background: color }} />
                <span className="min-w-[72px]">{name}</span>
                <span className="tabular-nums ml-2">{fakeValue}</span>
            </div>
        </div>
    );
}


