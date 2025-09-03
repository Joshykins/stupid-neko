import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { ProfileSummary } from "../../components/ProfileSummary";
import ManuallyTrackRecord from "../../components/dashboard/ManuallyTrackRecord";
import TrackedHistoryCard from "../../components/dashboard/TrackedHistoryCard";
import Heatmap from "../../components/Heatmap";
import { api } from "../../../../../convex/_generated/api";
import { DonutChartCard } from "../../components/marketing/DonutChartCard";
import { WeeklyBarsCard } from "../../components/marketing/WeeklyBarsCard";
import { DashboardTopBar } from "./DashboardTopBar";

export default async function DashboardPage() {


    return (
        <main className="py-6">
            <DashboardTopBar />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-1 space-y-4">
                    <ManuallyTrackRecord />
                    <TrackedHistoryCard />
                </div>
                <div className="lg:col-span-1 space-y-4">
                    <ProfileSummary />
                </div>
                <div className="lg:col-span-1 space-y-4">
                    <Heatmap title="Daily Streak" cellSize={14} values={undefined} liveVersion={true} />
                    <DonutChartCard />
                    <WeeklyBarsCard />
                </div>
            </div>
        </main>
    );
}


