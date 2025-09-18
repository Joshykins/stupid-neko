"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import LanguageFlagSVG from "../../components/LanguageFlagSVG";
import { Button } from "../../components/ui/button";
import { COMMON_LANGUAGES } from "../../lib/languages";
import { Card, CardContent } from "../../components/ui/card";
import { BookOpen } from "lucide-react";

export const DashboardTopBar = () => {
    const me = useQuery(api.meFunctions.me);

    const targetLanguage = me?.languageCode ?? "en";
    const targetLanguageLabel = COMMON_LANGUAGES.find((l) => l.code === targetLanguage)?.label ?? "English";
    return (
        <div className="p-4">
            <div className="flex gap-10 pl-20 items-center">
                {/* Track Activity button moved into the manual tile */}
                <Button variant={"neutral"} className="overflow-hidden">
                    <LanguageFlagSVG language={targetLanguage} className="!size-6" />
                    Learning {targetLanguageLabel}
                </Button>
                {/* buttons for different views, history(30d,7d,all), timeline, and flashcards */}

                <div className="flex items-center gap-1 pl-2 py-0 divide-x divide-x-border">

                    <Button variant={"neutral"} className="overflow-hidden">
                        7d
                    </Button>
                    <Button variant={"neutral"} className="overflow-hidden">
                        30d
                    </Button>
                    <Button variant={"neutral"} className="overflow-hidden">
                        All
                    </Button>
                </div>

                <Button variant={"neutral"} className="overflow-hidden">
                    <BookOpen />
                    Flashcards
                </Button>
            </div>
        </div>
    );
};