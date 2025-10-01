'use server';

import StreakDisplayCard from '../components/cards/streaks-card/StreakDisplayCard';
import { StreakVacationCard } from '../components/cards/streaks-card/StreakVacationCard';
import { UserProgressCard } from '../components/cards/UserProgressCard';
import Hero from '../components/Hero';
import { DiscordCard } from '../components/marketing/DiscordCard';
import { DonutChartCard } from '../components/marketing/DonutChartCard';
import { IntegrationsCard } from '../components/marketing/IntegrationsCard';
import ReviewsShowcase, { demoReviews } from '../components/marketing/Reviews';
import { WeeklyBarsCard } from '../components/marketing/WeeklyBarsCard';
import Pricing from '../components/Pricing';
import UserXPChart from '../components/userXPChart';

export default async function Home() {
	return (
		<main className="pb-16">
			<Hero />
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
				<ReviewsShowcase
					className="col-span-1 md:col-span-2"
					reviews={demoReviews}
				/>
				<DiscordCard className="col-span-1" />
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4" id="demo">
				<div className="lg:col-span-1 grid grid-cols-1 gap-4">
					<UserProgressCard isLiveVersion={false} />
					<UserXPChart isLiveVersion={false} />
				</div>
				<div className="lg:col-span-1 grid grid-cols-1 gap-4">
					<IntegrationsCard />
				</div>
				<div className="lg:col-span-1 grid grid-cols-1 gap-4">
					{/* <DonutChartCard /> */}
					<StreakDisplayCard title="Daily Streak" />
					<StreakVacationCard isLiveVersion={false} />
					<WeeklyBarsCard />
				</div>
			</div>
			<div className="pt-4">
				<Pricing />
			</div>
		</main>
	);
}
