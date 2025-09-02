"use server";

import Hero from "../components/Hero";
import Pricing from "../components/Pricing";
import { WeeklyBarsCard } from "../components/marketing/WeeklyBarsCard";
import { DiscordCard } from "../components/marketing/DiscordCard";
import { IntegrationsCard } from "../components/marketing/IntegrationsCard";
import Heatmap from "../components/Heatmap";
import ReviewsShowcase, { demoReviews } from "../components/marketing/Reviews";
import { ProfileSummary } from "../components/ProfileSummary";
import { DonutChartCard } from "../components/marketing/DonutChartCard";

export default async function Home() {

	return (
		<main className="pb-16">
			<Hero />
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
				<ReviewsShowcase className="col-span-1 md:col-span-2" reviews={demoReviews} />
				<DiscordCard className="col-span-1" />
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4" id="demo">
				<div className="lg:col-span-1 grid grid-cols-1 gap-4">
					<Heatmap title="Daily Streak" cellSize={14} />
					<IntegrationsCard />
				</div>
				<div className="lg:col-span-1 grid grid-cols-1 gap-4">
					<ProfileSummary />
				</div>
				<div className="lg:col-span-1 grid grid-cols-1 gap-4">
					<DonutChartCard />
					<WeeklyBarsCard />
				</div>
			</div>
			<div className="pt-4">
				<Pricing />
			</div>
		</main>
	);
}
