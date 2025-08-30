"use client";

import Hero from "../components/Hero";
import Pricing from "../components/Pricing";
import { WeeklyBarsCard } from "../components/marketing/WeeklyBarsCard";
import { DonutChartCard } from "../components/marketing/DonutChartCard";
import { DiscordCard } from "../components/marketing/DiscordCard";
import { SkillBalanceCard } from "../components/marketing/SkillBalanceCard";
import { IntegrationsCard } from "../components/marketing/IntegrationsCard";
import Heatmap from "../components/Heatmap";

export default function Home() {
	return (
		<main className="pb-16">
			<Hero />
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4" id="demo">
				<div className="lg:col-span-1 grid grid-cols-1 gap-4">
					<IntegrationsCard />
					<Heatmap title="Daily Streak" cellSize={14} />
				</div>
				<div className="lg:col-span-1 grid grid-cols-1 gap-4">
					<SkillBalanceCard />
				</div>
				<div className="lg:col-span-1 grid grid-cols-1 gap-4">
					<DiscordCard />
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
