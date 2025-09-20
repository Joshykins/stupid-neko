"use client";

import { motion, useAnimationFrame, useReducedMotion } from "framer-motion";
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

// --- Types
export type Review = {
	id: string;
	name: string;
	handle?: string;
	avatarUrl?: string;
	rating: 1 | 2 | 3 | 4 | 5;
	text: string;
	source?: "Discord" | "Reddit" | "App" | "Twitter" | "YouTube" | string;
	date?: string;
};

type Variant = "marquee" | "card";

export type ReviewsShowcaseProps = {
	reviews: Review[];
	variant?: Variant; // marquee = infinite scroll; card = swipeable deck
	direction?: "left" | "right";
	speed?: number; // pixels per second
	className?: string;
};

// --- Helpers
const Stars: React.FC<{ rating: number }> = ({ rating }) => (
	<div
		className="flex items-center gap-0.5"
		aria-label={`${rating} out of 5 stars`}
	>
		{Array.from({ length: 5 }).map((_, i) => (
			<svg
				key={i}
				viewBox="0 0 20 20"
				className={`h-4 w-4 ${i < rating ? "fill-main" : "fill-border"}`}
				aria-hidden="true"
			>
				<path d="M10 15.27 16.18 19l-1.64-7.03L20 7.24l-7.19-.62L10 0 7.19 6.62 0 7.24l5.46 4.73L3.82 19 10 15.27z" />
			</svg>
		))}
	</div>
);

const ReviewCard: React.FC<
	{ r: Review } & React.HTMLAttributes<HTMLDivElement>
> = ({ r, className = "", ...rest }) => (
	<Card
		className={"group relative w-[20rem] shrink-0 px-4 py-3 " + className}
		{...rest}
	>
		<div className="flex items-center gap-3">
			<Avatar>
				{r.avatarUrl ? (
					<AvatarImage src={r.avatarUrl} alt="" />
				) : (
					<AvatarFallback>
						{r.name
							.split(" ")
							.map((n) => n[0])
							.slice(0, 2)
							.join("")}
					</AvatarFallback>
				)}
			</Avatar>
			<div className="min-w-0">
				<div className="flex items-center gap-2">
					<p className="truncate font-semibold text-main-foreground">
						{r.name}
					</p>
					{r.handle && (
						<span className="truncate text-xs text-foreground/70">
							@{r.handle}
						</span>
					)}
				</div>
				<Stars rating={r.rating} />
			</div>
			{r.source && (
				// keep the badge size stable so cards don't jiggle
				<Badge className="ml-auto shrink-0 px-2 py-0.5 text-xs">
					{r.source}
				</Badge>
			)}
		</div>
		{/* Text should never use text-background; that matched your BG and looked faded */}
		<p className="mt-3 line-clamp-5 text-sm leading-snug text-main-foreground/90">
			{r.text}
		</p>
		{r.date && <p className="mt-2 text-xs text-foreground/70">{r.date}</p>}
	</Card>
);

// --- Marquee variant
const Marquee: React.FC<
	Omit<ReviewsShowcaseProps, "variant"> & { _id?: string }
> = ({ reviews, direction = "left", speed = 80, className = "" }) => {
	const prefersReduced = useReducedMotion();
	const xRef = React.useRef(0);
	const containerRef = React.useRef<HTMLDivElement>(null);
	const [paused, setPaused] = React.useState(false);

	// smoother loop using modulo to avoid a visible jump on reset
	useAnimationFrame((t, delta) => {
		if (prefersReduced || paused) return;
		const container = containerRef.current;
		if (!container) return;

		const pxPerMs = (speed / 1000) * (direction === "left" ? -1 : 1);
		xRef.current += pxPerMs * delta;

		const trackWidth = container.scrollWidth / 2; // because we duplicate
		// wrap with modulo so there is no momentary flicker
		const wrapped = ((xRef.current % trackWidth) + trackWidth) % trackWidth; // positive modulo
		container.style.transform = `translateX(${direction === "left" ? wrapped * -1 : wrapped}px)`;
	});

	const duplicated = React.useMemo(() => [...reviews, ...reviews], [reviews]);

	return (
		<div
			className={"relative overflow-hidden rounded-base " + className}
			onMouseEnter={() => setPaused(true)}
			onMouseLeave={() => setPaused(false)}
		>
			{/* Edge fades that don't overlap controls */}
			<div className="pointer-events-none absolute inset-y-0 left-0 w-16 [mask-image:linear-gradient(to_right,transparent,black)]" />
			<div className="pointer-events-none absolute inset-y-0 right-0 w-16 [mask-image:linear-gradient(to_left,transparent,black)]" />

			<div className="relative flex">
				{/* Add padding to avoid the first/last card looking chopped under the mask */}
				<div
					ref={containerRef}
					className="flex gap-4 will-change-transform px-2"
				>
					{duplicated.map((r, i) => (
						<ReviewCard key={`${r.id}-${i}`} r={r} />
					))}
				</div>
			</div>
		</div>
	);
};

// --- Card (swipeable) variant
const SwipeDeck: React.FC<
	Omit<ReviewsShowcaseProps, "variant"> & { _id?: string }
> = ({ reviews, className = "" }) => {
	return (
		<div
			className={
				"relative rounded-base border-2 border-border bg-secondary-background p-4 shadow-shadow " +
				className
			}
		>
			<div className="mb-3 flex items-center justify-between">
				<p className="text-sm font-semibold text-main-foreground">Reviews</p>
				<div className="text-xs text-foreground/80">Swipe or use arrows</div>
			</div>

			<motion.div
				className="overflow-hidden"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.4 }}
			>
				<motion.div
					className="flex gap-4"
					drag="x"
					dragConstraints={{
						left: -Math.max(0, reviews.length * 320 - 320),
						right: 0,
					}}
					whileTap={{ cursor: "grabbing" }}
				>
					{reviews.map((r) => (
						<ReviewCard key={r.id} r={r} />
					))}
				</motion.div>
			</motion.div>

			{/* Dots */}
			<div className="mt-4 flex justify-center gap-1.5">
				{reviews.slice(0, 8).map((_, i) => (
					<div
						key={i}
						className="h-1.5 w-6 rounded-full bg-main-foreground/20"
					/>
				))}
			</div>
		</div>
	);
};

// --- Main exported component
const ReviewsShowcase: React.FC<ReviewsShowcaseProps> = ({
	reviews,
	variant = "marquee",
	direction,
	speed,
	className,
}) => {
	if (variant === "card") {
		return <SwipeDeck reviews={reviews} className={className} />;
	}
	return (
		<Marquee
			reviews={reviews}
			direction={direction}
			speed={speed}
			className={className}
		/>
	);
};

export default ReviewsShowcase;

// --- Example usage ----------------------------------------------------------
export const demoReviews: Review[] = [
	{
		id: "1",
		name: "Aiko Tanaka",
		handle: "aiko",
		rating: 5,
		text: "Hit a 30‑day streak and the app dropped a celebratory meme in Discord. Actually made me laugh while studying kanji.",
		source: "Discord",
		date: "2 days ago",
	},
	{
		id: "2",
		name: "Marco S",
		rating: 5,
		text: "The auto‑nya‑lytics are wild. I just listen to music and YouTube and the stats update by themselves.",
		source: "App",
		date: "This week",
	},
	{
		id: "3",
		name: "Yuri P",
		rating: 4,
		text: "Finally a tracker that gets immersion. My Anki + Spotify habits are all in one place.",
		source: "Reddit",
	},
	{
		id: "4",
		name: "Samir",
		rating: 5,
		text: "Clean UI, cute cat, and the XP bar is dangerously motivating.",
		source: "Twitter",
	},
	{
		id: "5",
		name: "Lucia",
		rating: 5,
		text: "I learn when I’m bored now. Subway Surfers + vocab = focus mode.",
		source: "App",
	},
	{
		id: "6",
		name: "Kenji",
		rating: 5,
		text: "Hit N5 in 6 months. The weekly charts showed exactly where I was slacking.",
		source: "App",
	},
];
