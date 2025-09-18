"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Award, BookOpenText, CalendarDays, Flame, MessageCircle, Zap } from "lucide-react";
import LanguageFlagSVG from "./LanguageFlagSVG";
import { useEffect, useState } from "react";
import type { LanguageCode } from "../../../../convex/schema";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Authenticated, Unauthenticated } from "convex/react";
import { COMMON_LANGUAGES } from "../lib/languages";
import LevelExperienceInfo from "./LevelExperienceInfo";
import XpAreaChart from "./XpAreaChart";
import dayjs from "@dayjs";

type MockUser = {
    name: string;
    level: number;
    avatarUrl: string;
    isLeaderboardPlacer: boolean;
    skills: Array<{ label: string; value: number; hours: number; }>;
    recentWins: Array<string>;
    language: "japanese";
    totalHours: number;
    // Add missing properties to match real user data structure
    currentLevel: number;
    experienceTowardsNextLevel: number;
    nextLevelXp: number;
    totalMinutesLearning: number;
    image?: string;
    currentStreak?: number;
    longestStreak?: number;
    targetLanguageCreatedAt: number;
    userCreatedAt: number;
};

const mockUser: MockUser = {
    name: "Kenji",
    level: 59,
    avatarUrl: "/stupid-neko-icon.png",
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
    currentLevel: 62,
    experienceTowardsNextLevel: 700,
    totalMinutesLearning: 560 * 60, // Convert hours to minutes
    nextLevelXp: 1900,
    targetLanguageCreatedAt: Date.now() - 1000 * 60 * 60 * 24 * 200,
    userCreatedAt: Date.now() - 1000 * 60 * 60 * 24 * 365,
};


export const UserSummary = ({ isLiveVersion = false }: { isLiveVersion: boolean; }) => {
    const userProgress = useQuery(api.meFunctions.getUserProgress, {});

    // Use real data if available, otherwise fall back to mock data
    // Only use real data when it's fully loaded (not undefined)
    const displayData = userProgress ? userProgress : mockUser;

    const currentLevel = displayData.currentLevel;
    const experienceTowardsNextLevel = displayData.experienceTowardsNextLevel;
    const nextLevelXp = displayData.nextLevelXp;

    const xpPercent = Math.min(100, Math.round((experienceTowardsNextLevel / nextLevelXp) * 100));
    const xpString = `${experienceTowardsNextLevel?.toLocaleString() || 0} / ${nextLevelXp?.toLocaleString() || 0} XP`;

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
    const hasPreReleaseCode = Boolean(userProgress?.hasPreReleaseCode);

    return (
        <Card className="flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="flex w-full justify-between">
                    <div className="flex items-center gap-3 min-w-0 sm:flex-1">
                        <Avatar className="size-12 shrink-0">
                            <AvatarImage src={displayData.image || mockUser.avatarUrl} alt={displayData.name || mockUser.name} />
                            <AvatarFallback>{(displayData.name || mockUser.name).at(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex justify-between w-full">


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
                    </div>
                    <div className="flex flex-col gap-2 items-end sm:items-end shrink-0">

                        <Badge variant={"neutral"} className="whitespace-nowrap">
                            <LanguageFlagSVG language={languageInfo.flag} className="!h-4 !w-4" />
                            Learning {languageInfo.name}
                        </Badge>


                        {!isLiveVersion && (
                            <Badge className="inline-flex items-center gap-1 whitespace-nowrap">
                                <Award className="size-3" /> Top 3%
                            </Badge>
                        )}

                        {isLiveVersion && hasPreReleaseCode && (
                            <Badge className="inline-flex items-center gap-1 whitespace-nowrap bg-slate-900 border-main !shadow-[4px_4px_0px_0px_var(--main)] text-orange-100">
                                Insider
                            </Badge>
                        )}
                    </div>

                </CardTitle>
            </CardHeader>
            <CardContent className="px-4">

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
                            <span className="text-right justify-end w-full flex items-center gap-2">
                                <LevelExperienceInfo />
                                {userProgress
                                    ? `${experienceTowardsNextLevel?.toLocaleString() || 0} / ${nextLevelXp?.toLocaleString() || 0} XP`
                                    : `${experienceTowardsNextLevel?.toLocaleString() || 0} / ${nextLevelXp?.toLocaleString() || 0} XP`
                                }
                            </span>
                        </div>
                        <div className="mt-2">
                            <Progress value={displayedXpPercent} indicatorColor={"var(--color-level)"} />
                        </div>
                    </div>
                </div>
                <div className="flex gap-4 flex-wrap pt-4 items-start">

                    {/*  */}
                    <div className="flex items-center gap-2 font-normal text-sm">
                        <BookOpenText className="size-4" /><span>Tracking <b>{languageInfo.name}</b> since <b>{dayjs(userProgress?.targetLanguageCreatedAt || mockUser.targetLanguageCreatedAt).format("MMM Do, YYYY")}</b>.</span>
                    </div>

                    {/* <div className="items-center text-sm font-normal flex gap-1">
                        <span className="font-bold">23</span> Followers
                    </div>


                    <div className="items-center text-sm font-normal flex gap-1">
                        <span className="font-bold">3</span> Following
                    </div> */}


                </div>
            </CardContent>


        </Card>
    );
};




