'use client';

import { useMutation, useQuery } from 'convex/react';
import { ExternalLink, Star } from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';
import { toast } from 'sonner';
import { api } from '../../../../../../convex/_generated/api';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import { Id } from '../../../../../../convex/_generated/dataModel';

export const FavoritesPotentialManualRecordsList = ({
	onFavoriteAdded,
}: {
	onFavoriteAdded?: () => void;
}) => {
	const [cursor, setCursor] = React.useState<number | undefined>(undefined);
	const recentManuals = useQuery(
		api.userTargetLanguageFavoriteActivityFunctions
			.listManualActivitiesWithFavoriteMatch,
		{ limit: 8, cursorOccurredAt: cursor }
	);
	const setFavorite = useMutation(
		api.userTargetLanguageFavoriteActivityFunctions.addFavoriteFromActivity
	);
	const deleteFavorite = useMutation(
		api.userTargetLanguageFavoriteActivityFunctions.deleteFavorite
	);
	const [historyCursorStack, setHistoryCursorStack] = React.useState<
		Array<number | undefined>
	>([]);

	return (
		<div className="flex flex-col h-full">
			<ScrollArea className="max-h-[60vh] flex-1">
				<div>
					{!recentManuals && (
						<div className="flex items-center justify-center h-20">
							<div className="text-center">
								<Image
									src="/cat-on-tree.png"
									alt="loading"
									className="mx-auto opacity-80"
									width={140}
									height={140}
								/>
								<div className="mt-2 text-sm text-background/80">
									Loading your recent manual records…
								</div>
							</div>
						</div>
					)}
					{recentManuals && recentManuals.page?.length === 0 && (
						<div className="flex items-center justify-center h-20">
							<div className="text-center">
								<Image
									src="/cat-on-tree.png"
									alt="empty"
									className="mx-auto opacity-80"
									width={140}
									height={140}
								/>
								<div className="mt-2 text-sm text-background/80">
									No manual records yet. Start by tracking your first activity!
								</div>
							</div>
						</div>
					)}
					{recentManuals && recentManuals.page?.length > 0 && (
						<ul className="space-y-2">
							{recentManuals.page.map(r => (
								<li
									key={r._id}
									className="flex items-center justify-between gap-3 p-2 rounded-base border-2 border-border bg-secondary-background"
								>
									<div className="min-w-0 flex-1">
										{r.externalUrl ? (
											<span className="inline-flex items-center gap-1 max-w-full">
												<a
													href={r.externalUrl}
													target="_blank"
													rel="noreferrer"
													className="font-bold truncate underline decoration-main text-background hover:text-background/80"
												>
													{r.title ?? '(untitled)'}
												</a>
												<a
													href={r.externalUrl}
													target="_blank"
													rel="noreferrer"
													aria-label="Open link"
													className="text-background/80 hover:text-background flex-shrink-0"
												>
													<ExternalLink className="!size-4" />
												</a>
											</span>
										) : (
											<div className="font-bold truncate text-background">
												{r.title ?? '(untitled)'}
											</div>
										)}
										<div className="text-xs text-background/70 flex items-center gap-2">
											<span>
												{Math.max(
													0,
													Math.round((r.durationInSeconds ?? 0) / 60)
												)}
												m
											</span>
											{r.occurredAt && (
												<span>• {new Date(r.occurredAt).toLocaleString()}</span>
											)}
											{r.description && (
												<span className="truncate max-w-[240px]">
													• {r.description}
												</span>
											)}
										</div>
									</div>
									<Button
										type="button"
										size="icon"
										onClick={async () => {
											const isCurrentlyFavorite = !!r.matchedFavoriteId;
											try {
												if (isCurrentlyFavorite) {
													// Remove from favorites
													await deleteFavorite({
														favoriteId:
															r.matchedFavoriteId as Id<'userTargetLanguageFavoriteActivities'>,
													});
													toast.success('Removed from favorites');
												} else {
													// Add to favorites
													await setFavorite({
														activityId:
															r._id as Id<'userTargetLanguageActivities'>,
														isFavorite: true,
													});
													toast.success('Added to favorites!');
													onFavoriteAdded?.();
												}
											} catch {
												toast.error('Failed to update favorite');
											}
										}}
										className="p-1 bg-secondary-background"
										aria-label={
											r.matchedFavoriteId
												? 'Remove from favorites'
												: 'Add to favorites'
										}
									>
										<Star
											className={`!size-5 transition-colors ${
												r.matchedFavoriteId
													? 'fill-yellow-300 stroke-border'
													: 'stroke-background/60'
											}`}
										/>
									</Button>
								</li>
							))}
						</ul>
					)}
				</div>
			</ScrollArea>
			{recentManuals &&
				(recentManuals.continueCursor || historyCursorStack.length > 0) && (
					<div className="flex items-center justify-between pt-4">
						<Button
							variant="neutral"
							onClick={() => {
								setHistoryCursorStack(stack => {
									if (stack.length === 0) return stack;
									const next = [...stack];
									const prev = next.pop();
									setCursor(prev);
									return next;
								});
							}}
							disabled={historyCursorStack.length === 0}
						>
							Back
						</Button>
						<Button
							variant="neutral"
							onClick={() => {
								setHistoryCursorStack(stack => [...stack, cursor]);
								setCursor(recentManuals.continueCursor);
							}}
							disabled={Boolean(recentManuals) && Boolean(recentManuals.isDone)}
						>
							Load more
						</Button>
					</div>
				)}
		</div>
	);
};
