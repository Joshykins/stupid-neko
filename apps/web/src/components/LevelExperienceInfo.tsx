"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "./ui/chart";
import {
    CartesianGrid,
    XAxis,
    YAxis,
} from "recharts";
import { ScrollArea } from "./ui/scroll-area";
import { totalXpForLevel, xpForNextLevel } from "../../../../lib/levelAndExperienceCalculations/levelAndExperienceCalculator";
import { Bar, BarChart } from "recharts";

type LevelPoint = { level: number; totalXp: number; deltaXp: number; };

function generateLevelData(maxLevel: number = 60): Array<LevelPoint> {
    const data: Array<LevelPoint> = [];
    for (let lvl = 1; lvl <= maxLevel; lvl++) {
        const total = totalXpForLevel(lvl);
        const delta = xpForNextLevel(lvl);
        data.push({ level: lvl, totalXp: total, deltaXp: delta });
    }
    return data;
}

export default function LevelExperienceInfo({ maxLevel = 60 }: { maxLevel?: number; }) {
    const data = React.useMemo(() => generateLevelData(maxLevel), [maxLevel]);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Level/XP info">
                    <Info className="size-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-3 bg-secondary-background">
                <div className="mb-2">
                    <div className="font-semibold leading-none text-foreground">Level & Experience Curve</div>
                    <div className="text-xs text-foreground mt-1">
                        Each level requires more XP. Uses the centralized leveling math.
                    </div>
                </div>
                <ScrollArea className="h-[280px]">
                    <div className="pr-2">
                        <ChartContainer
                            config={{
                                cost: { label: "XP to Next Level", color: "var(--color-chart-2)" },
                            }}
                            className="aspect-[4/3] bg-background rounded-base border-2 border-border px-2 pt-2"
                        >
                            <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="level"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    width={40}
                                    tickFormatter={(v) => (typeof v === "number" ? v.toLocaleString() : String(v))}
                                />
                                {/** Casting due to Recharts generic prop types not aligning with our wrapper component */}
                                <ChartTooltip content={((props: any) => (<ChartTooltipContent {...props} className="bg-background" />)) as any} />
                                <Bar dataKey="deltaXp" name="cost" fill="var(--color-cost)" stroke="var(--color-cost)" />
                                <ChartLegend content={(legendProps: any) => {
                                    const { payload, verticalAlign } = legendProps || {};
                                    return (
                                        <ChartLegendContent
                                            payload={payload}
                                            verticalAlign={verticalAlign}
                                            className="bg-background px-2 py-1 rounded-base border-2 border-border"
                                        />
                                    );
                                }} />
                            </BarChart>
                        </ChartContainer>
                        <div className="text-xs text-foreground mt-2">
                            Y: XP cost to reach next level • X: current level.
                        </div>
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}


