"use client";
import {
	Award,
	BookOpenCheck,
	Brain,
	Film,
	Gamepad2,
	Headphones,
	Sparkles,
	Timer,
	TrendingUp,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../components/ui/card";

export default function OurMethodPage() {
	return (
		<main className="pb-20">
			{/* Heading Card */}
			<section className="px-4 pt-6 md:pt-10">
				<Card className="mx-auto max-w-4xl bg-foreground text-main-foreground border-border">
					<CardHeader className="text-left">
						<Badge className="mb-2">our method</Badge>
						<CardTitle className="font-display text-3xl md:text-5xl font-black tracking-[-0.02em] flex items-center justify-start gap-3">
							<Sparkles className="size-6 md:size-8 text-main" />
							The Easy Way to Learn a Language
						</CardTitle>
					</CardHeader>
					<CardContent className="mx-auto max-w-3xl text-base md:text-lg text-main-foreground/90 space-y-3">
						<p>Most people quit because language learning feels like school.</p>
						<p className="flex items-start gap-2">
							<Gamepad2 className="mt-0.5 size-4 text-main" /> Spend time with
							shows, music, posts, and games.
						</p>
						<p className="flex items-start gap-2">
							<Timer className="mt-0.5 size-4 text-main" /> Do small daily
							practice with words and sentences.
						</p>
						<p className="flex items-start gap-2">
							<TrendingUp className="mt-0.5 size-4 text-main" /> We track
							everything automatically and show your progress.
						</p>
						<p className="pt-1">
							With this mix, you get better every day without the grind.
						</p>

						{/* Dashboard-style chips */}
						<div className="pt-2 flex flex-wrap gap-2">
							<Badge
								variant="neutral"
								className="inline-flex items-center gap-1"
							>
								<Film className="size-3" /> Immersion
							</Badge>
							<Badge
								variant="neutral"
								className="inline-flex items-center gap-1"
							>
								<BookOpenCheck className="size-3" /> Flashcards
							</Badge>
							<Badge
								variant="neutral"
								className="inline-flex items-center gap-1"
							>
								<TrendingUp className="size-3" /> Progress
							</Badge>
							<Badge
								variant="neutral"
								className="inline-flex items-center gap-1"
							>
								<Award className="size-3" /> Badges
							</Badge>
						</div>

						{/* Subtle progress stripe motif */}
						<div className="pt-3">
							<div className="h-2 rounded-base overflow-hidden border-2 border-border bg-secondary-background">
								<div className="grid grid-cols-4 h-full">
									<div
										style={{
											backgroundColor: "var(--color-source-youtube-soft)",
										}}
									/>
									<div
										style={{
											backgroundColor: "var(--color-source-spotify-soft)",
										}}
									/>
									<div
										style={{ backgroundColor: "var(--color-source-anki-soft)" }}
									/>
									<div
										style={{ backgroundColor: "var(--color-source-misc-soft)" }}
									/>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</section>

			{/* Vertical cards */}
			<section className="mt-8 space-y-8 px-4 max-w-4xl mx-auto">
				{/* Card 1 — Build Your Words & Sentences */}
				<Card className="bg-foreground border-border overflow-hidden transition-all hover:translate-x-reverseBoxShadowX hover:translate-y-reverseBoxShadowY hover:shadow-shadow">
					<CardHeader className="p-0">
						<div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-main/15 rounded-t-base">
							<div className="rounded-base bg-main text-background p-2 shadow-shadow">
								<BookOpenCheck className="size-5" />
							</div>
							<CardTitle className="font-display text-2xl font-black text-main-foreground">
								Build Your Words & Sentences
							</CardTitle>
						</div>
					</CardHeader>
					<CardContent className="text-main-foreground/90 space-y-2">
						<p className="flex items-start gap-2">
							<Brain className="mt-0.5 size-4 text-main" /> Flashcards: quick
							daily review to lock in vocab.
						</p>
						<p className="flex items-start gap-2">
							<Film className="mt-0.5 size-4 text-main" /> Sentence mining: grab
							real sentences from media you watch; we save them as cards for
							you.
						</p>
						<p className="flex items-start gap-2">
							<Sparkles className="mt-0.5 size-4 text-main" /> Grammar: learn
							the patterns as they appear, not from a textbook.
						</p>
						<p className="pt-2 text-main-foreground">
							<span className="mr-2">👉</span> These give you the building
							blocks you need.
						</p>
					</CardContent>
				</Card>

				{/* Card 2 — Learn Through Immersion */}
				<Card className="bg-foreground border-border overflow-hidden transition-all hover:translate-x-reverseBoxShadowX hover:translate-y-reverseBoxShadowY hover:shadow-shadow">
					<CardHeader className="p-0">
						<div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-main/15 rounded-t-base">
							<div className="rounded-base bg-main text-background p-2 shadow-shadow">
								<Headphones className="size-5" />
							</div>
							<CardTitle className="font-display text-2xl font-black text-main-foreground">
								Learn Through Immersion
							</CardTitle>
						</div>
					</CardHeader>
					<CardContent className="text-main-foreground/90 space-y-2">
						<p>
							Watch shows, listen to music, scroll posts — all in your new
							language.
						</p>
						<p>You see words and grammar in action, not just on a list.</p>
						<p>This makes the language feel natural and easier to remember.</p>
					</CardContent>
				</Card>

				{/* Card 3 — Track, Grow & Compete */}
				<Card className="bg-foreground border-border overflow-hidden transition-all hover:translate-x-reverseBoxShadowX hover:translate-y-reverseBoxShadowY hover:shadow-shadow">
					<CardHeader className="p-0">
						<div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-main/15 rounded-t-base">
							<div className="rounded-base bg-main text-background p-2 shadow-shadow">
								<Award className="size-5" />
							</div>
							<CardTitle className="font-display text-2xl font-black text-main-foreground">
								Track, Grow & Compete
							</CardTitle>
						</div>
					</CardHeader>
					<CardContent className="text-main-foreground/90 space-y-2">
						<p>Our app connects to YouTube, Spotify, Anki, and more.</p>
						<p>Every minute, word, and sentence is logged for you.</p>
						<p>You gain XP, level up, and unlock badges.</p>
						<p>
							Share wins as memes, keep streaks alive, and climb the leaderboard
							with friends.
						</p>
					</CardContent>
				</Card>
			</section>

			<section className="mt-12 md:mt-14 flex justify-center px-4 max-w-4xl mx-auto">
				<Button asChild size="cta">
					<Link href="/create-account">Try it free</Link>
				</Button>
			</section>
		</main>
	);
}
