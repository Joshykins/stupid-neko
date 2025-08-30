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
        listening: { label: "Listening", color: "var(--color-chart-1)" },
        watching: { label: "Watching", color: "var(--color-chart-2)" },
        flashcards: { label: "Flashcards", color: "var(--color-chart-3)" },
        grammar: { label: "Grammar", color: "var(--color-chart-4)" },
    } as const;

    const data = [
        { day: "Mon", listening: 20, watching: 35, flashcards: 18, grammar: 12 },
        { day: "Tue", listening: 28, watching: 22, flashcards: 26, grammar: 10 },
        { day: "Wed", listening: 16, watching: 30, flashcards: 14, grammar: 8 },
        { day: "Thu", listening: 34, watching: 18, flashcards: 32, grammar: 14 },
        { day: "Fri", listening: 22, watching: 25, flashcards: 20, grammar: 9 },
        { day: "Sat", listening: 12, watching: 14, flashcards: 10, grammar: 6 },
        { day: "Sun", listening: 18, watching: 28, flashcards: 16, grammar: 7 },
    ];
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-display text-xl font-black">Weekly distribution</CardTitle>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig}>
                    <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 16 }}>
                        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} tick={<Tick />} />
                        <YAxis hide />
                        <Bar dataKey="listening" stackId="a" fill="var(--color-listening)" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="watching" stackId="a" fill="var(--color-watching)" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="flashcards" stackId="a" fill="var(--color-flashcards)" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="grammar" stackId="a" fill="var(--color-grammar)" radius={[2, 2, 0, 0]} />
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


