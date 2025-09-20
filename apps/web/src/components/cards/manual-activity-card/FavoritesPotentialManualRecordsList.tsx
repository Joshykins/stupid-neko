"use client";

import { useMutation, useQuery } from "convex/react";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { api } from "../../../../../../convex/_generated/api";
import { Button } from "../../ui/button";
import { ScrollArea } from "../../ui/scroll-area";

export const FavoritesPotentialManualRecordsList = () => {
	const [cursor, setCursor] = React.useState<number | undefined>(undefined);
	const recentManuals = useQuery(
		api.userTargetLanguageFavoriteActivityFunctions
			.listManualActivitiesWithFavoriteMatch,
		{ limit: 12, cursorOccurredAt: cursor },
	);
	const setFavorite = useMutation(
		api.userTargetLanguageFavoriteActivityFunctions.addFavoriteFromActivity,
	);
	const [historyCursorStack, setHistoryCursorStack] = React.useState<
		Array<number | undefined>
	>([]);

	return (
		<ScrollArea className="h-[420px]">
			<div className="p-4">
				{!recentManuals && (
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
								Loading your recent manual records…
							</div>
						</div>
					</div>
				)}
				{recentManuals && (recentManuals as any).page?.length === 0 && (
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
								No manual records yet. Start by tracking your first activity!
							</div>
						</div>
					</div>
				)}
				{recentManuals && (recentManuals as any).page?.length > 0 && (
					<ul className="space-y-2">
						{(recentManuals as any).page.map((r: any) => (
							<li
								key={(r as any)._id}
								className="flex items-center justify-between gap-3 p-2 rounded-base border-2 border-border bg-secondary-background"
							>
								<div className="min-w-0 flex-1">
									{r.externalUrl ? (
										<span className="inline-flex items-center gap-1 max-w-full">
											<a
												href={r.externalUrl}
												target="_blank"
												rel="noreferrer"
												className="font-bold truncate underline decoration-main hover:text-main-foreground/80"
											>
												{(r as any).title ?? "(untitled)"}
											</a>
											<a
												href={r.externalUrl}
												target="_blank"
												rel="noreferrer"
												aria-label="Open link"
												className="text-main-foreground/80 hover:text-main-foreground flex-shrink-0"
											>
												<ExternalLink className="!size-4" />
											</a>
										</span>
									) : (
										<div className="font-bold truncate">
											{(r as any).title ?? "(untitled)"}
										</div>
									)}
									<div className="text-xs text-muted-foreground flex items-center gap-2">
										<span>
											{Math.max(
												0,
												Math.round(((r as any).durationInMs ?? 0) / 60000),
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
									variant="neutral"
									size="sm"
									onClick={() =>
										setFavorite({
											activityId: (r as any)._id,
											isFavorite: true,
										})
									}
								>
									Add Favorite
								</Button>
							</li>
						))}
					</ul>
				)}
				{recentManuals &&
					((recentManuals as any).continueCursor ||
						historyCursorStack.length > 0) && (
						<div className="flex items-center justify-between mt-3">
							<Button
								variant="neutral"
								onClick={() => {
									setHistoryCursorStack((stack) => {
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
									setHistoryCursorStack((stack) => [...stack, cursor]);
									setCursor((recentManuals as any).continueCursor);
								}}
								disabled={
									Boolean(recentManuals) &&
									Boolean((recentManuals as any).isDone)
								}
							>
								Load more
							</Button>
						</div>
					)}
			</div>
		</ScrollArea>
	);
};
