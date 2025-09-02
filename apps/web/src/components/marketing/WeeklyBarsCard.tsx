"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { BarChart, Bar, XAxis, YAxis } from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
} from "../ui/chart";

export function WeeklyBarsCard() {
    const formatMinutes = (mins: number) => {
        const m = Math.max(0, Math.round(mins));
        const h = Math.floor(m / 60);
        const r = m % 60;
        if (h > 0) return r > 0 ? `${h}h ${r}m` : `${h}h`;
        return `${r}m`;
    };

    const Tick = (props: any) => {
        const { x, y, payload } = props;
        return (
            <g transform={`translate(${x},${y})`}>
                <text dy={12} textAnchor="middle" style={{ fill: "var(--color-main-foreground)" }} className="font-bold">
                    {payload?.value}
                </text>
            </g>
        );
    };
    const chartConfig = {
        youtube: { label: "YouTube", color: "var(--color-source-youtube-soft)" },
        spotify: { label: "Spotify", color: "var(--color-source-spotify-soft)" },
        anki: { label: "Anki", color: "var(--color-source-anki-soft)" },
        misc: { label: "Misc", color: "var(--color-source-misc-soft)" },
    } as const;

    const data = [
        { day: "Mon", youtube: 60, spotify: 35, anki: 20, misc: 10 },
        { day: "Tue", youtube: 40, spotify: 28, anki: 26, misc: 12 },
        { day: "Wed", youtube: 30, spotify: 22, anki: 18, misc: 8 },
        { day: "Thu", youtube: 55, spotify: 26, anki: 24, misc: 10 },
        { day: "Fri", youtube: 42, spotify: 25, anki: 20, misc: 9 },
        { day: "Sat", youtube: 24, spotify: 14, anki: 16, misc: 6 },
        { day: "Sun", youtube: 36, spotify: 20, anki: 18, misc: 7 },
    ];
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-display text-xl font-black">Weekly source distribution</CardTitle>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig}>
                    <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 16 }}>
                        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} tick={<Tick />} />
                        <YAxis hide />
                        <Bar dataKey="youtube" stackId="a" fill="var(--color-source-youtube-soft)" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="spotify" stackId="a" fill="var(--color-source-spotify-soft)" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="anki" stackId="a" fill="var(--color-source-anki-soft)" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="misc" stackId="a" fill="var(--color-source-misc-soft)" radius={[2, 2, 0, 0]} />
                        <ChartTooltip
                            cursor={false}
                            content={(props: any) => (
                                <ChartTooltipContent
                                    {...props}
                                    labelKey="day"
                                    formatter={(value: number, name: string, item: any, index: number, payload: any) => {
                                        const label = (chartConfig as any)[name]?.label || name;
                                        const color = (payload?.fill ?? item?.payload?.fill ?? item?.color) as string | undefined;
                                        return (
                                            <>
                                                <span className="inline-block w-3 h-3 rounded-sm border border-border mr-2 align-middle" style={{ backgroundColor: color }} />
                                                <span className="text-muted-foreground mr-2">{label}</span>
                                                <span className="text-main-foreground font-mono font-medium tabular-nums">{formatMinutes(Number(value))}</span>
                                            </>
                                        );
                                    }}
                                />
                            )}
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}


