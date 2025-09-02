"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Award, Flame, MessageCircle, Zap } from "lucide-react";
import LanguageFlagSVG from "./LanguageFlagSVG";
import { useEffect, useState } from "react";

type MockUser = {
    name: string;
    level: number;
    avatarUrl: string;
    xp: number;
    nextLevelXp: number;
    isLeaderboardPlacer: boolean;
    skills: Array<{ label: string; value: number; hours: number; }>;
    recentWins: Array<string>;
    language: "japanese";
    totalHours: number;
};

const mockUser: MockUser = {
    name: "Kenji",
    level: 59,
    avatarUrl: "/cat-on-tree.png",
    xp: 1200,
    nextLevelXp: 1900,
    isLeaderboardPlacer: true,
    skills: [
        { label: "Reading", value: 42, hours: 120 },
        { label: "Listening", value: 68, hours: 210 },
        { label: "Speaking", value: 55, hours: 150 },
        { label: "Writing", value: 28, hours: 80 },
    ],
    recentWins: ["Hit 200-day streak! (Meme sent to Discord)", "+50 XP to Speaking Lv. 6"],
    language: "japanese",
    totalHours: 560,
};

export const ProfileSummary = () => {
    const xpPercent = Math.min(
        100,
        Math.round((mockUser.xp / mockUser.nextLevelXp) * 100),
    );

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        const id = requestAnimationFrame(() => setIsMounted(true));
        return () => cancelAnimationFrame(id);
    }, []);
    const displayedXpPercent = isMounted ? xpPercent : 0;

    return (
        <Card>
            <CardHeader className="border-b pb-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Avatar className="size-12">
                            <AvatarImage src={mockUser.avatarUrl} alt={mockUser.name} />
                            <AvatarFallback>{mockUser.name.at(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-2xl flex items-center gap-2 leading-none">
                                {mockUser.name}

                            </CardTitle>
                            <div className="text-muted-foreground mt-1">Level {mockUser.level}</div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                        {mockUser.isLeaderboardPlacer && (

                            <Badge className="inline-flex items-center gap-1 whitespace-nowrap">
                                <Award className="size-3" /> Top 3%
                            </Badge>
                        )}
                        <Badge variant={"neutral"}>
                            <LanguageFlagSVG language={"ja"} className="!h-4 !w-4" />

                            Learning Japanese
                        </Badge>
                    </div>

                </div>
                <div className="flex gap-4 items-baseline">
                    <div className="shadow-shadow border-border border-2 rounded-base mt-2 p-2 ">
                        <div className="font-semibold text-xs">Tracked Hours</div>
                        <div className="text-2xl font-bold text-main-foreground">{mockUser.totalHours.toLocaleString()} hrs</div>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between text-sm font-medium">

                            <span className="text-right w-full">
                                {mockUser.xp.toLocaleString()} / {mockUser.nextLevelXp}xp
                            </span>
                        </div>
                        <div className="mt-2">
                            <Progress value={displayedXpPercent} indicatorColor={"var(--color-level)"} />
                        </div></div>
                </div>


            </CardHeader>
            <CardContent className="pt-6">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 font-semibold text-lg">
                            <Award className="size-4" /> Latest achievements
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-2">
                            {mockUser.recentWins.map((win, idx) => {
                                const lower = win.toLowerCase();
                                let Icon = Award;
                                let colorVar = "var(--color-accent)";
                                if (lower.includes("streak")) {
                                    Icon = Flame;
                                    colorVar = "var(--color-heatmap-3)";
                                } else if (lower.includes("xp") || lower.includes("level") || lower.includes("lv")) {
                                    Icon = Zap;
                                    if (lower.includes("speaking")) colorVar = "var(--color-speaking)";
                                    else if (lower.includes("listening")) colorVar = "var(--color-listening)";
                                    else if (lower.includes("reading")) colorVar = "var(--color-reading)";
                                    else if (lower.includes("writing")) colorVar = "var(--color-writing)";
                                    else colorVar = "var(--color-chart-1)";
                                }
                                return (
                                    <li key={idx} className="flex items-center gap-2">
                                        <span
                                            className="inline-flex items-center justify-center rounded-full border-2 border-border"
                                            style={{ width: 24, height: 24, backgroundColor: colorVar }}
                                        >
                                            <Icon className="size-3 text-background" />
                                        </span>
                                        <span>{win}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <div className="font-semibold text-lg">Category Levels</div>
                        <div className="grid grid-cols-1 gap-3">
                            {mockUser.skills.map((skill) => {
                                const key = skill.label.toLowerCase();
                                const colorVarMap: Record<string, string> = {
                                    reading: "var(--color-reading)",
                                    listening: "var(--color-listening)",
                                    speaking: "var(--color-speaking)",
                                    writing: "var(--color-writing)",
                                };
                                const colorVar = colorVarMap[key] || "var(--color-main)";
                                return (
                                    <div key={skill.label} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span>{skill.label}</span>
                                            <span className="text-muted-foreground">{skill.value}% • {skill.hours} hrs</span>
                                        </div>
                                        <Progress value={isMounted ? skill.value : 0} indicatorColor={colorVar} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-muted-foreground">
                        <div className="inline-flex items-center gap-1"><Flame className="size-4" /> 200 day streak</div>
                        <div className="inline-flex items-center gap-1"><MessageCircle className="size-4" /> Discord auto-share</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};


