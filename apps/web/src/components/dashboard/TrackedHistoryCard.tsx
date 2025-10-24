'use client';

import { useQuery, useMutation } from 'convex/react';
import { ExternalLink, Rocket, Zap, History, Trash2 } from 'lucide-react';
import * as React from 'react';
import { api } from '../../../../../convex/_generated/api';
import type { LanguageCode } from '../../../../../convex/schema';
import Image from 'next/image';
import { LanguageFlagSVG } from '../LanguageFlagSVG';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
// Use Convex-generated return types; avoid local type definitions
// Avoid Radix ScrollArea here to prevent inner display: table wrapper pushing content
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '../ui/tooltip';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '../ui/dialog';
import { FunctionReturnType } from 'convex/server';
import dayjs from '../../../../../lib/dayjs';
import { cn } from '../../lib/utils';

//

function formatTime(ts?: number, timeZone?: string): string {
	if (!ts) return '';
	const tsDate = timeZone ? dayjs(ts).tz(timeZone) : dayjs(ts);
	return tsDate.format('LT').toLowerCase(); // "11:24 AM" -> "11:24 am"
}

function dateFooterLabel(
	ts?: number,
	timeZone?: string,
	effectiveNow?: number
): string {
	if (!ts) return '';

	// Use effectiveNow if provided (includes devDate), otherwise use current time
	const nowTimestamp = effectiveNow ?? Date.now();
	const now = timeZone ? dayjs(nowTimestamp).tz(timeZone) : dayjs(nowTimestamp);
	const tsDate = timeZone ? dayjs(ts).tz(timeZone) : dayjs(ts);

	// If it's today, show only the time
	if (tsDate.isSame(now, 'day')) {
		return formatTime(ts, timeZone);
	}

	// If it's yesterday, show "Yesterday"
	if (tsDate.isSame(now.subtract(1, 'day'), 'day')) {
		return 'Yesterday';
	}

	// If it's within the last 7 days, show the day name
	if (tsDate.isAfter(now.subtract(7, 'days'))) {
		return tsDate.format('dddd'); // "Monday", "Tuesday", etc.
	}

	// If it's within the last 30 days, show relative time
	if (tsDate.isAfter(now.subtract(30, 'days'))) {
		return tsDate.from(now); // "3 days ago", "2 weeks ago"
	}

	// For older dates, show the month and day
	return tsDate.format('MMM D'); // "Sep 20", "Dec 25"
}

function formatHoursMinutesLabel(totalSeconds?: number): string {
	const seconds = Math.max(0, Math.floor(totalSeconds ?? 0));
	const totalMinutes = Math.floor(seconds / 60);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	const remainingSeconds = seconds % 60;
	const parts: Array<string> = [];

	// If less than 1 minute, show only seconds
	if (totalMinutes === 0) {
		if (remainingSeconds > 0) {
			parts.push(`${remainingSeconds}s`);
		}
		return parts.join(' ');
	}

	// For 1 minute or more, show hours and minutes
	if (hours > 0) {
		parts.push(`${hours}h`);
		if (minutes > 0) parts.push(`${minutes}m`);
	} else {
		// Less than 1 hour: show minutes and seconds if under 10 minutes
		if (totalMinutes < 10) {
			parts.push(`${minutes}m`);
			if (remainingSeconds > 0) {
				parts.push(`${remainingSeconds}s`);
			}
		} else {
			// 10+ minutes: show only minutes
			parts.push(`${minutes}m`);
		}
	}

	return parts.join(' ');
}

// Language flag SVG is provided by LanguageFlagSVG component

// Configurable page size for the recent activity list
const PAGE_SIZE = 8;

type RecentData = FunctionReturnType<
	typeof api.userTargetLanguageActivityFunctions.listRecentLanguageActivities
>;
type RecentItems = RecentData['items'];
type RecentItem = RecentItems extends Array<infer T> ? T : never;

const TrackedHistoryItem = ({
	item,
	timeZone,
	effectiveNow,
}: {
	item: RecentItem;
	timeZone?: string;
	effectiveNow?: number;
}) => {
	const contentKey = item.contentKey;
	const key =
		item.isManuallyTracked || !contentKey
			? 'manual'
			: contentKey.startsWith('youtube:')
				? 'youtube'
				: contentKey.startsWith('spotify:')
					? 'spotify'
					: contentKey.startsWith('anki:')
						? 'anki'
						: contentKey.startsWith('website:')
							? 'website'
							: 'manual';

	// Derive presentation fields
	const legacyDurationSeconds = (item as { durationInSeconds?: number; })
		.durationInSeconds;
	const durationMs =
		(item as { durationMs?: number; }).durationMs ??
		(item as { durationInMs?: number; }).durationInMs ??
		(typeof legacyDurationSeconds === 'number'
			? legacyDurationSeconds * 1000
			: undefined) ??
		0;
	const durationSeconds = Math.max(0, Math.round(durationMs / 1000));
	const occurredAt = item.occurredAt ?? item._creationTime;

	// Calculate XP - use awarded experience for completed, estimate for in-progress
	const isInProgress = item.state == 'in-progress';
	console.log(item.state, "STAte?", isInProgress);
	const xp = Math.max(0, Math.floor(item.awardedExperience ?? 0));

	const SOURCE_STYLES: Record<
		string,
		{ dot: string; border: string; badge: string; }
	> = React.useMemo(
		() => ({
			youtube: {
				dot: 'bg-[var(--source-youtube)]',
				border: 'border-[var(--source-youtube)]',
				badge: 'bg-[var(--source-youtube-soft)]',
			},
			spotify: {
				dot: 'bg-[var(--source-spotify)]',
				border: 'border-[var(--source-spotify)]',
				badge: 'bg-[var(--source-spotify-soft)]',
			},
			anki: {
				dot: 'bg-[var(--source-anki)]',
				border: 'border-[var(--source-anki)]',
				badge: 'bg-[var(--source-anki-soft)]',
			},
			website: {
				dot: 'bg-[var(--source-website)]',
				border: 'border-[var(--source-website)]',
				badge: 'bg-[var(--source-website-soft)]',
			},
			manual: {
				dot: 'bg-[var(--source-misc)]',
				border: 'border-[var(--source-misc)]',
				badge: 'bg-[var(--source-misc-soft)]',
			},
		}),
		[]
	);

	const SOURCE_ICON: Record<string, string> = React.useMemo(
		() => ({
			youtube: '/brands/youtube.svg',
			spotify: '/brands/spotify.svg',
			anki: '/brands/anki.svg',
			website: '/brands/browser-extension.svg',
		}),
		[]
	);

	const styles = SOURCE_STYLES[key] ?? SOURCE_STYLES.manual;

	// For website sources, extract domain from title if it contains "website:domain" pattern
	let title = item.label?.title ?? item.title ?? '(untitled)';
	if (key === 'website' && title.startsWith('website:')) {
		title = title.split(':')[1] || title;
	}

	// Handle contentKey fallbacks for better UX
	if (title === item.contentKey) {
		if (key === 'spotify') {
			title = 'Spotify Track';
		} else if (key === 'youtube') {
			title = 'YouTube Video';
		} else if (key === 'anki') {
			title = 'Anki Deck';
		} else if (key === 'website') {
			title = 'Website Content';
		} else {
			title = 'Learning Activity';
		}
	}

	const deleteActivity = useMutation(api.userTargetLanguageActivityFunctions.deleteLanguageActivity);
	const [deleting, setDeleting] = React.useState(false);
	const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);

	const onDelete = () => {
		setShowConfirmDialog(true);
	};

	const onConfirmDelete = async () => {
		setDeleting(true);
		try {
			await deleteActivity({ activityId: item._id as any });
		} finally {
			setDeleting(false);
			setShowConfirmDialog(false);
		}
	};

	return (
		<li key={item._id as string}>
			<Tooltip delayDuration={500}>
				<TooltipTrigger asChild>
					<div
						className={cn(`group flex items-center  justify-between gap-3 p-2 rounded-base transition-all border-2 hover:border-2 border-border/10	`, isInProgress ? 'bg-secondary-background border-border shadow-shadow' : '')}
					// aria-label={`${title} ${item.source ? `from ${item.source}` : ""}`}
					>
						<div className="flex items-center gap-3 flex-1">
							{key === 'manual' ? (
								<Zap
									size={24}
									className="fill-black stroke-black inline-block"
								/>
							) : SOURCE_ICON[key] ? (
								<Image
									src={SOURCE_ICON[key]}
									alt={key}
									width={24}
									height={24}
									className="inline-block"
								/>
							) : (
								<span
									className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${styles.dot}`}
								></span>
							)}
							<div className="min-w-0 flex-1 flex flex-col items-start gap-1">
								<div className="font-bold flex items-center gap-1 min-w-0">
									{item.label?.contentUrl ? (
										<>
											<a
												href={item.label.contentUrl}
												target="_blank"
												rel="noreferrer"
												className="underline max-w-[200px] decoration-main !truncate min-w-0 flex-1"
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
								<span className="text-xs text-muted-foreground flex items-center gap-2">
									{isInProgress && (
										<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-black border border-border bg-experience">
											In Progress
										</span>
									)}
									{!isInProgress && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-black border border-border bg-experience">
										<Rocket className="!size-3" /> {xp.toLocaleString()} XP
									</span>} <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-black border border-border">
										{formatHoursMinutesLabel(durationSeconds)}
									</span>
									{!isInProgress && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-background text-main-foreground border border-border">
										{dateFooterLabel(occurredAt, timeZone, effectiveNow)}
									</span>}
								</span>
							</div>
						</div>
						<div className="flex items-center gap-2 flex-shrink-0 text-sm whitespace-nowrap font-bold font-display text-main-foreground">
							{!isInProgress && <Button
								size="icon"
								variant={"neutral"}
								aria-label="Delete activity"
								onClick={onDelete}
								disabled={deleting}
							>
								<Trash2 className="!size-4" />
							</Button>}
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
							{key !== 'manual' && (
								<span
									className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${styles.badge}`}
								>
									<span className="opacity-90">{key === 'website' ? 'website' : key}</span>
								</span>
							)}

							{isInProgress && (
								<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-black border border-border bg-experience">
									In Progress
								</span>
							)}
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-black border border-border">
								{formatHoursMinutesLabel(durationSeconds)}
							</span>
							{!isInProgress && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-black border border-border bg-experience">
								<Rocket className="!size-3" /> {xp.toLocaleString()} XP
							</span>}
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

			<Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Delete Activity</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this activity? This will undo the XP gained from it and cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="neutral"
							onClick={() => setShowConfirmDialog(false)}
							disabled={deleting}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={onConfirmDelete}
							disabled={deleting}
						>
							{deleting ? 'Deleting...' : 'Delete'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</li>
	);
};

export default function TrackedHistoryCard() {
	const [page, setPage] = React.useState(1);
	const me = useQuery(api.userFunctions.me, {});
	const data = useQuery(
		api.userTargetLanguageActivityFunctions.listRecentLanguageActivities,
		{ limit: page * PAGE_SIZE + 1 }
	);

	const items = React.useMemo(() => {
		if (!data) return [] as RecentItems;
		// Show the latest activities for current page, prioritizing in-progress items first
		const startIndex = (page - 1) * PAGE_SIZE;
		const endIndex = page * PAGE_SIZE;
		const pageItems = data.items.slice(startIndex, endIndex);
		return pageItems.slice().sort((a, b) => {
			// Prioritize in-progress activities at the top
			const aActive = a.state === 'in-progress';
			const bActive = b.state === 'in-progress';
			if (aActive && !bActive) return -1;
			if (!aActive && bActive) return 1;
			return (
				(b.occurredAt ?? b._creationTime) - (a.occurredAt ?? a._creationTime)
			);
		}) as RecentItems;
	}, [data, page]);

	// Clamp page when items shrink (e.g., after deletions) so we never point past the end
	React.useEffect(() => {
		if (!data) return;
		const totalItems = data.items.length;
		const maxPage = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
		if (page > maxPage) setPage(maxPage);
	}, [data, page]);

	const { visibleItems, hasPrev, hasNext } = React.useMemo(() => {
		const hasMoreData = data && data.items.length > page * PAGE_SIZE;
		return {
			visibleItems: items,
			hasPrev: page > 1,
			hasNext: hasMoreData,
		};
	}, [items, page, data]);

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-3">
					<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
						<History className="w-8 h-8 text-primary" />
					</div>
					<div>
						<CardTitle className="text-lg">Recent Activity</CardTitle>
						<p className="text-sm text-muted-foreground mt-1">
							Your latest language learning progress
						</p>
					</div>
				</div>
			</CardHeader>
			<CardContent className="p-0">
				<ScrollArea className="h-[420px]">
					<div className="p-4">
						{!data && (
							<div className="flex items-center justify-center h-[300px]">
								<div className="text-center">
									<Image
										src="/cat-on-tree.png"
										alt="loading"
										className="mx-auto opacity-80"
										width={140}
										height={140}
									/>
									<div className="mt-2 text-sm text-muted-foreground">
										Fetching your activity…
									</div>
								</div>
							</div>
						)}
						{data && items.length === 0 && (
							<div className="flex items-center justify-center h-[300px]">
								<div className="text-center">
									<Image
										src="/cat-on-tree.png"
										alt="empty"
										className="mx-auto opacity-80"
										width={140}
										height={140}
									/>
									<div className="mt-2 text-sm text-muted-foreground">
										No tracked items yet.
									</div>
								</div>
							</div>
						)}
						{items.length > 0 && (
							<TooltipProvider delayDuration={0}>
								<ul className="space-y-2">
									{visibleItems.map(i => (
										<TrackedHistoryItem
											key={String(i._id)}
											item={i}
											timeZone={me?.timezone}
											effectiveNow={data?.effectiveNow}
										/>
									))}
								</ul>
							</TooltipProvider>
						)}
					</div>
				</ScrollArea>
				{items.length > 0 && (
					<div className="p-3 border-t border-border flex items-center justify-between gap-2">
						<Button
							variant="neutral"
							size="sm"
							disabled={!hasPrev}
							onClick={() => setPage(p => Math.max(1, p - 1))}
						>
							Previous
						</Button>
						<div className="text-xs text-muted-foreground">Page {page}</div>
						<Button
							size="sm"
							disabled={!hasNext}
							onClick={() => setPage(p => p + 1)}
						>
							Load more
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
