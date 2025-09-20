import * as React from "react";
import { AddManualActvitiyCard } from "../../components/cards/manual-activity-card/AddManualActvitiyCard";
import StreakDisplayCard from "../../components/cards/streaks-card/StreakDisplayCard";
import { StreakVacationCard } from "../../components/cards/streaks-card/StreakVacationCard";
import { UsersSummaryCard } from "../../components/cards/UsersSummaryCard";
import IntegrationsCard from "../../components/dashboard/IntegrationsCard";
import TrackedHistoryCard from "../../components/dashboard/TrackedHistoryCard";
import { WeeklyBarsCard } from "../../components/marketing/WeeklyBarsCard";
import UserXPChart from "../../components/userXPChart";
import { DashboardTopBar } from "./DashboardTopBar";

export default async function DashboardPage() {
	return (
		<main className="py-6">
			<DashboardTopBar />
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<div className="lg:col-span-1 space-y-4">
					<AddManualActvitiyCard />
					<TrackedHistoryCard />
				</div>
				<div className="lg:col-span-1 space-y-4">
					<UsersSummaryCard isLiveVersion={true} />
					<UserXPChart isLiveVersion={true} />
					<IntegrationsCard />
				</div>
				<div className="lg:col-span-1 space-y-4">
					<StreakDisplayCard
						title="Daily Streak"
						cellSize={14}
						liveVersion={true}
					/>

					<StreakVacationCard isLiveVersion={true} />
					{/* <DonutChartCard /> */}
					<WeeklyBarsCard />
				</div>
			</div>
		</main>
	);
}
