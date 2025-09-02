"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";

type Trend = { direction: "up" | "down" | "neutral"; delta: number; };

export default function MetricCard({ label, value, trend }: { label: string; value: string | number; trend?: Trend; }) {
    const TrendIcon = trend?.direction === "up" ? ArrowUp : trend?.direction === "down" ? ArrowDown : ArrowRight;
    const trendColor = trend?.direction === "up" ? "text-emerald-600" : trend?.direction === "down" ? "text-rose-600" : "text-muted-foreground";

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                    <div className="text-3xl font-display font-black text-main-foreground">{value}</div>
                    {trend && (
                        <div className={["inline-flex items-center gap-1 text-sm font-medium", trendColor].join(" ")}>
                            <TrendIcon className="size-4" />
                            <span>{trend.delta}%</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}


