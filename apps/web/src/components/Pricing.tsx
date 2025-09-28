'use client';
import { Check, Rocket } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

function Yes() {
	return (
		<span className="inline-flex w-6 h-6 items-center justify-center rounded-sm border-2 border-black bg-emerald-400 text-background shadow-[2px_2px_0_0_#000]">
			<Check size={14} strokeWidth={3} />
		</span>
	);
}

function No() {
	return (
		<span className="inline-flex w-6 h-6 items-center justify-center rounded-sm border-2 border-black bg-muted shadow-[2px_2px_0_0_#000] text-sm">
			—
		</span>
	);
}

const PRICING_FEATURES: Array<{
	id: string;
	title: string;
	description: string;
	free: boolean;
	pro: boolean;
}> = [
	{
		id: 'connect',
		title: 'Connect your apps',
		description: 'Anki, YouTube, Spotify, and more. We tag and dedupe.',
		free: false,
		pro: true,
	},
	{
		id: 'add-yourself',
		title: 'Add it yourself (fast)',
		description: 'Log sessions, vocab, or notes in a few taps. Works offline.',
		free: true,
		pro: true,
	},
	{
		id: 'auto-track',
		title: 'We track it for you',
		description: 'Minutes, reviews, words, listening, streaks. Weekly summary.',
		free: false,
		pro: true,
	},
	{
		id: 'share',
		title: 'Share your progress',
		description: 'Share a public stats link with friends or your group.',
		free: true,
		pro: true,
	},
	{
		id: 'celebrate',
		title: 'Celebrate wins',
		description:
			'Hit milestones? We create‑memes and post to the StupidNeko Discord.',
		free: false,
		pro: true,
	},
	{
		id: 'leaderboards',
		title: 'Leaderboards',
		description: 'Rank with friends and worldwide. Resets weekly.',
		free: true,
		pro: true,
	},
];

const SORTED_FEATURES = PRICING_FEATURES.slice().sort(
	(a, b) => Number(b.free) - Number(a.free)
);

export default function Pricing() {
	return (
		<section>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
				{/* Free plan */}
				<Card className="p-6">
					<CardHeader className="p-0 min-h-16">
						<CardTitle className="font-display text-3xl font-black flex items-center justify-between">
							<span>StupidNeko Free</span>

							<div className="flex items-center gap-3 text-2xl font-display font-black">
								<span>$0.00</span>
							</div>
						</CardTitle>
					</CardHeader>
					<CardContent className="p-0 ">
						<ul className="mt-4 divide-y-2 divide-border border-2 border-border rounded-lg overflow-hidden">
							{SORTED_FEATURES.map(f => (
								<li
									key={f.id}
									className="grid grid-cols-[1fr_auto] items-center px-4 py-3 odd:bg-secondary-background bg-foreground"
								>
									<div>
										<div className="font-bold">{f.title}</div>
										<div className="text-sm text-muted-foreground">
											{f.description}
										</div>
									</div>
									{f.free ? <Yes /> : <No />}
								</li>
							))}
						</ul>
						<div className="mt-5">
							<Button
								asChild
								size="lg"
								variant="neutral"
								className="w-full no-underline"
							>
								<Link href="/start?plan=free">Get started</Link>
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Pro plan */}
				<Card className="p-6">
					<CardHeader className="p-0 min-h-16">
						<CardTitle className="font-display text-3xl font-black flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
							<span>
								StupidNeko{' '}
								<Badge>
									<Rocket size={14} /> Pro
								</Badge>
							</span>{' '}
							<div className="flex items-center text-2xl gap-3">
								<span className="text-muted-foreground line-through font-bold">
									$19.99/mo
								</span>
								<span className="relative inline-flex items-center px-2 py-1 bg-background text-foreground border-2 border-border rounded-sm  font-black">
									$15.99/mo
									<Badge
										variant={'neutral'}
										className="ml-2 sm:ml-0 sm:absolute sm:-top-4.5 sm:-right-6 sm:rotate-6"
									>
										Launch deal
									</Badge>
								</span>
							</div>
						</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<ul className="mt-4 divide-y-2 divide-border border-2 border-border rounded-lg overflow-hidden">
							{SORTED_FEATURES.map(f => (
								<li
									key={f.id}
									className="grid grid-cols-[1fr_auto] items-center px-4 py-3 odd:bg-secondary-background bg-foreground"
								>
									<div>
										<div className="font-bold">{f.title}</div>
										<div className="text-sm text-muted-foreground">
											{f.description}
										</div>
									</div>
									{f.pro ? <Yes /> : <No />}
								</li>
							))}
						</ul>
						<div className="mt-5">
							<Button asChild size="lg" className="w-full no-underline">
								<Link href="/start?plan=pro">Upgrade</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</section>
	);
}
