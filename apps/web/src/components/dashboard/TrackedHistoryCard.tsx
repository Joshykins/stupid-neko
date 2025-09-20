"use client";

import { useQuery } from "convex/react";
import { BookA, ExternalLink, Rocket, Zap, ZapOff } from "lucide-react";
import * as React from "react";
import { api } from "../../../../../convex/_generated/api";
import type { LanguageCode } from "../../../../../convex/schema";
import { LanguageFlagSVG } from "../LanguageFlagSVG";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
// Use Convex-generated return types; avoid local type definitions
// Avoid Radix ScrollArea here to prevent inner display: table wrapper pushing content
import { ScrollArea } from "../ui/scroll-area";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../ui/tooltip";

function capitalize(word: string | undefined): string {
	if (!word) return "";
	return word.charAt(0).toUpperCase() + word.slice(1);
}

function humanDate(ts?: number): string {
	if (!ts) return "";
	const d = new Date(ts);
	const now = new Date();
	const startOfToday = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
	).getTime();
	const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
	if (ts >= startOfToday) return "Today";
	if (ts >= startOfYesterday) return "Yesterday";
	return d.toLocaleDateString();
}

function formatTime(ts?: number): string {
	if (!ts) return "";
	const d = new Date(ts);
	return d
		.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
		.toLowerCase();
}

function dateFooterLabel(ts?: number): string {
	if (!ts) return "";
	const d = new Date(ts);
	const now = new Date();
	const startOfToday = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
	).getTime();
	if (ts >= startOfToday) {
		return `${formatTime(ts)}`;
	}
	const dateStr = d.toLocaleDateString(undefined, {
		month: "long",
		day: "numeric",
	});
	return `${dateStr}, ${formatTime(ts)}`;
}

function formatHoursMinutesLabel(totalSeconds?: number): string {
	const seconds = Math.max(0, Math.floor(totalSeconds ?? 0));
	const totalMinutes = Math.floor(seconds / 60);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	const parts: Array<string> = [];
	if (hours > 0) parts.push(`${hours}h`);
	// Show minutes if there are any, or always when hours is 0 (e.g., 0h 05m -> 5m)
	if (minutes > 0 || hours === 0) parts.push(`${minutes}m`);
	return parts.join(" ");
}

// Language flag SVG is provided by LanguageFlagSVG component

type RecentItems = NonNullable<
	ReturnType<
		typeof useQuery<
			typeof api.userTargetLanguageActivityFunctions.listRecentLanguageActivities
		>
	>
>;
type RecentItem = RecentItems extends Array<infer T> ? T : never;

const TrackedHistoryItem = ({ item }: { item: RecentItem }) => {
	const key = item.sourceKey ?? "manual";

	const xp = Math.max(0, Math.floor(item.awardedExperience ?? 0));

	const SOURCE_STYLES: Record<
		string,
		{ dot: string; border: string; badge: string }
	> = React.useMemo(
		() => ({
			youtube: {
				dot: "bg-[var(--source-youtube)]",
				border: "border-[var(--source-youtube)]",
				badge: "bg-[var(--source-youtube-soft)]",
			},
			spotify: {
				dot: "bg-[var(--source-spotify)]",
				border: "border-[var(--source-spotify)]",
				badge: "bg-[var(--source-spotify-soft)]",
			},
			anki: {
				dot: "bg-[var(--source-anki)]",
				border: "border-[var(--source-anki)]",
				badge: "bg-[var(--source-anki-soft)]",
			},
			manual: {
				dot: "bg-[var(--source-misc)]",
				border: "border-[var(--source-misc)]",
				badge: "bg-[var(--source-misc-soft)]",
			},
		}),
		[],
	);

	const SOURCE_ICON: Record<string, string> = React.useMemo(
		() => ({
			youtube: "/brands/youtube.svg",
			spotify: "/brands/spotify.svg",
			anki: "/brands/anki.svg",
		}),
		[],
	);

	const styles = SOURCE_STYLES[key] ?? SOURCE_STYLES.manual;

	// Derive presentation fields
	const durationMs =
		(item as any).durationMs ??
		(item as any).durationInMs ??
		(item.durationInSeconds ?? 0) * 1000;
	const durationSeconds = Math.max(0, Math.round(durationMs / 1000));
	const occurredAt = item.occurredAt ?? item._creationTime;
	const title = item.title ?? item.label?.title ?? "(untitled)";

	return (
		<li key={item._id as unknown as string}>
			<Tooltip>
				<TooltipTrigger asChild>
					<div
						className={`group flex items-center  justify-between gap-3 p-2 rounded-base transition-all border-2 hover:border-2 border-border/10 hover:border-border hover:translate-x-reverseBoxShadowX hover:translate-y-reverseBoxShadowY hover:shadow-shadow`}
						aria-label={`${title} ${item.source ? `from ${item.source}` : ""}`}
					>
						<div className="flex items-center gap-3 flex-1">
							{key === "manual" ? (
								<Zap
									size={24}
									className="fill-black stroke-black inline-block"
								/>
							) : SOURCE_ICON[key] ? (
								<img
									src={SOURCE_ICON[key]}
									alt={item.source ?? key}
									width={24}
									height={24}
									className="inline-block"
								/>
							) : (
								<span
									className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${styles.dot}`}
								></span>
							)}
							<div className="min-w-0 flex-1">
								<div className="font-bold flex items-center gap-1 min-w-0">
									{item.label?.contentUrl ? (
										<>
											<a
												href={item.label.contentUrl}
												target="_blank"
												rel="noreferrer"
												className="underline w-[200px] decoration-main !truncate min-w-0 flex-1"
											>
												<span className="truncate block min-w-0">{title}</span>
											</a>
											<a
												href={item.label.contentUrl}
												target="_blank"
												rel="noreferrer"
												aria-label="Open link"
												className="text-main-foreground/80 hover:text-main-foreground flex-shrink-0"
											>
												<ExternalLink className="!size-4" />
											</a>
										</>
									) : (
										<>
											<span className="truncate block min-w-0 flex-1">
												{title}
											</span>
										</>
									)}
								</div>
							</div>
						</div>
						<div className="flex-shrink-0 text-sm whitespace-nowrap font-bold font-display text-main-foreground">
							{xp} XP • {formatHoursMinutesLabel(durationSeconds)}
						</div>
					</div>
				</TooltipTrigger>
				<TooltipContent
					side="bottom"
					sideOffset={16}
					align="start"
					className="w-80"
				>
					<div className="space-y-2">
						<div className="text-base font-extrabold leading-tight">
							{title}
						</div>
						<div className="flex flex-wrap gap-1.5 text-[11px]">
							{item.languageCode && (
								<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-background text-main-foreground border border-border">
									<LanguageFlagSVG
										language={item.languageCode as LanguageCode}
										className="!w-4 !h-3 rounded-[2px]"
									/>
									<span className="uppercase tracking-wide">
										{item.languageCode}
									</span>
								</span>
							)}
							{item.source && (
								<span
									className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${styles.badge}`}
								>
									<span className="opacity-90">{item.source}</span>
								</span>
							)}
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-background text-main-foreground border border-border">
								{dateFooterLabel(occurredAt)}
							</span>
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-black border border-border">
								{formatHoursMinutesLabel(durationSeconds)}
							</span>
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-black border border-border bg-[var(--color-heatmap-1)]">
								<Rocket className="!size-3" /> {xp.toLocaleString()} XP
							</span>
						</div>
						{item.label?.authorName && (
							<div className="text-xs opacity-80">
								By {item.label.authorName}
							</div>
						)}
						{item.description && (
							<div className="text-xs opacity-90 leading-relaxed">
								{item.description}
							</div>
						)}
						{item.label?.contentUrl && (
							<a
								href={item.label.contentUrl}
								target="_blank"
								rel="noreferrer"
								className="text-xs underline"
							>
								Open content
							</a>
						)}
					</div>
				</TooltipContent>
			</Tooltip>
		</li>
	);
};

export default function TrackedHistoryCard() {
	const data = useQuery(
		api.userTargetLanguageActivityFunctions.listRecentLanguageActivities,
		{ limit: 20 },
	);

	const items = React.useMemo(() => {
		if (!data) return [] as RecentItems;
		const now = new Date();
		const startOfToday = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
		).getTime();
		const todays = data.filter(
			(doc) => (doc.occurredAt ?? doc._creationTime) >= startOfToday,
		);
		return todays.sort((a, b) => {
			const aActive = a.state === "in-progress";
			const bActive = b.state === "in-progress";
			if (aActive && !bActive) return -1;
			if (!aActive && bActive) return 1;
			return (
				(b.occurredAt ?? b._creationTime) - (a.occurredAt ?? a._creationTime)
			);
		}) as RecentItems;
	}, [data]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Recent Activity</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				<ScrollArea className="h-[420px]">
					<div className="p-4">
						{!data && (
							<div className="text-sm text-muted-foreground">Loading…</div>
						)}
						{data && items.length === 0 && (
							<div className="text-sm text-muted-foreground">
								No tracked items yet.
							</div>
						)}
						{items.length > 0 && (
							<TooltipProvider delayDuration={0}>
								<ul className="space-y-2">
									{items.map((i) => (
										<TrackedHistoryItem key={String(i._id)} item={i} />
									))}
								</ul>
							</TooltipProvider>
						)}
					</div>
				</ScrollArea>
			</CardContent>
		</Card>
	);
}
