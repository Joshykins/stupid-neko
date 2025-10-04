import * as React from 'react';
import { AddManualActvitiyCard } from '../../components/cards/manual-activity-card/AddManualActvitiyCard';
import StreakDisplayCard from '../../components/cards/streaks-card/StreakDisplayCard';
import { StreakVacationCard } from '../../components/cards/streaks-card/StreakVacationCard';
import { UserProgressCard } from '../../components/cards/UserProgressCard';
import TrackedHistoryCard from '../../components/dashboard/TrackedHistoryCard';
import { WeeklyBarsCard } from '../../components/marketing/WeeklyBarsCard';
import UserXPChart from '../../components/userXPChart';
import { DashboardTopBar } from '../dashboard/DashboardTopBar';

export default async function ActivityTimelinePage() {
	return (
		<main className="py-6">
			<DashboardTopBar />

		</main>
	);
}
