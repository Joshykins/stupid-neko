"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Award, Flame, MessageCircle, Zap } from "lucide-react";
import LanguageFlagSVG from "./LanguageFlagSVG";
import { useEffect, useState } from "react";
import type { LanguageCode } from "../../../../convex/schema";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Authenticated, Unauthenticated } from "convex/react";
import { COMMON_LANGUAGES } from "../lib/languages";
import LevelExperienceInfo from "./LevelExperienceInfo";

type MockUser = {
    name: string;
    lastLevelXp: number;
    level: number;
    avatarUrl: string;
    xp: number;
    nextLevelXp: number;
    isLeaderboardPlacer: boolean;
    skills: Array<{ label: string; value: number; hours: number; }>;
    recentWins: Array<string>;
    language: "japanese";
    totalHours: number;
    // Add missing properties to match real user data structure
    currentLevel: number;
    remainderXp: number;
    totalMinutesLearning: number;
    totalExperience: number;
    image?: string;
    currentStreak?: number;
    longestStreak?: number;
};

const mockUser: MockUser = {
    name: "Kenji",
    level: 59,
    avatarUrl: "/cat-on-tree.png",
    xp: 1200,
    nextLevelXp: 1900,
    lastLevelXp: 1600,
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
    // Add missing properties
    currentLevel: 59,
    remainderXp: 700,
    totalMinutesLearning: 560 * 60, // Convert hours to minutes
    totalExperience: 1200,
};

export const ProfileSummary = () => {
    const userProgress = useQuery(api.meFunctions.getUserProgress, {});

    // Use real data if available, otherwise fall back to mock data
    // Only use real data when it's fully loaded (not undefined)
    const displayData = userProgress ? userProgress : mockUser;

    // XP progress within current level - derived from totals
    const currentLevelStartXp = userProgress ? Math.pow(displayData.currentLevel - 1, 2) * 100 : Math.pow(mockUser.level - 1, 2) * 100;
    const nextLevelTotalXp = userProgress ? displayData.nextLevelXp : mockUser.nextLevelXp;
    const trueRemainderXp = userProgress ? Math.max(0, (displayData.totalExperience - currentLevelStartXp)) : mockUser.xp;
    const trueNextLevelXp = userProgress ? Math.max(1, nextLevelTotalXp - currentLevelStartXp) : mockUser.nextLevelXp;
    const trueXp = trueRemainderXp;

    // Calculate XP percentage based on available data
    const xpPercent = userProgress
        ? Math.min(100, Math.round((trueRemainderXp / trueNextLevelXp) * 100))
        : Math.min(100, Math.round((trueXp / trueNextLevelXp) * 100));

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        const id = requestAnimationFrame(() => setIsMounted(true));
        return () => cancelAnimationFrame(id);
    }, []);
    const displayedXpPercent = isMounted ? xpPercent : 0;

    // Helper function to get language display info
    const getLanguageInfo = (languageCode?: string): { flag: LanguageCode; name: string; } => {
        if (!languageCode) return { flag: "ja" as LanguageCode, name: "Japanese" };

        const language = COMMON_LANGUAGES.find(lang => lang.code === languageCode);
        if (language) {
            return { flag: language.code, name: language.label };
        }

        // Fallback to Japanese if language not found
        return { flag: "ja" as LanguageCode, name: "Japanese" };
    };

    const languageInfo = getLanguageInfo(userProgress?.languageCode);

    return (
        <Card>
            <CardHeader className="border-b pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                    <div className="flex items-center gap-3 min-w-0 sm:flex-1">
                        <Avatar className="size-12 shrink-0">
                            <AvatarImage src={displayData.image || mockUser.avatarUrl} alt={displayData.name || mockUser.name} />
                            <AvatarFallback>{(displayData.name || mockUser.name).at(0)}</AvatarFallback>
                        </Avatar>
                        <div >
                            <h6
                                className="text-2xl flex items-center gap-2 leading-none  max-w-full"
                                title={displayData.name || mockUser.name}
                            >
                                {displayData.name || mockUser.name}
                            </h6>
                            <div className="text-muted-foreground mt-1">Level {displayData.currentLevel || mockUser.level}</div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end sm:items-end shrink-0">
                        <Authenticated>
                            {/* Show real streak data if available */}
                            {displayData.currentStreak && displayData.currentStreak > 0 && (
                                <Badge variant="neutral" className="whitespace-nowrap">
                                    <Flame className="size-3" /> {displayData.currentStreak} day streak
                                </Badge>
                            )}
                        </Authenticated>

                        {/* Show leaderboard badge for all users */}
                        <LevelExperienceInfo />
                    </div>

                </div>
                <div className="flex gap-4 items-baseline">
                    <div className="shadow-shadow border-border border-2 rounded-base mt-2 p-2 ">
                        <div className="font-semibold text-xs">Tracked Hours</div>
                        <div className="text-2xl font-bold text-main-foreground">
                            {userProgress
                                ? Math.round((displayData.totalMinutesLearning || 0) / 60 * 10) / 10
                                : mockUser.totalHours
                            } hrs
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between text-sm font-medium">
                            <span className="text-right w-full">
                                {userProgress
                                    ? `${trueRemainderXp?.toLocaleString() || 0} / ${trueNextLevelXp?.toLocaleString() || 0} XP`
                                    : `${trueXp.toLocaleString()} / ${trueNextLevelXp} XP`
                                }
                            </span>
                        </div>
                        <div className="mt-2">
                            <Progress value={displayedXpPercent} indicatorColor={"var(--color-level)"} />
                        </div>
                    </div>
                </div>


            </CardHeader>
            <CardContent className="pt-6">
                <div className="flex flex-wrap gap-2 pb-2">
                    <Badge variant={"neutral"} className="whitespace-nowrap">
                        <LanguageFlagSVG language={languageInfo.flag} className="!h-4 !w-4" />
                        Learning {languageInfo.name}
                    </Badge>

                    {mockUser.isLeaderboardPlacer && (
                        <Badge className="inline-flex items-center gap-1 whitespace-nowrap">
                            <Award className="size-3" /> Top 3%
                        </Badge>
                    )}

                </div>
                <div className="space-y-4">

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 font-semibold text-lg">
                            <Award className="size-4" /> Latest achievements
                        </div>
                        <ul className="text-sm text-muted-foreground space-y-2">
                            {mockUser.recentWins.map((win) => {
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
                                    <li key={win.toLowerCase()} className="flex items-center gap-2">
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
                        <Authenticated>
                            {displayData.currentStreak && displayData.currentStreak > 0 ? (
                                <div className="inline-flex items-center gap-1">
                                    <Flame className="size-4" /> {displayData.currentStreak} day streak
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-1">
                                    <Flame className="size-4" /> Start your streak today!
                                </div>
                            )}
                        </Authenticated>
                        <Unauthenticated>
                            <div className="inline-flex items-center gap-1">
                                <Flame className="size-4" /> 200 day streak
                            </div>
                        </Unauthenticated>
                        <div className="inline-flex items-center gap-1">
                            <MessageCircle className="size-4" /> Discord auto-share
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};


