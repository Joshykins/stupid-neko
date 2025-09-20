"use client";

import { useMutation, useQuery } from "convex/react";
import { Clock, ExternalLink, MoreHorizontal, PlusCircle } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { api } from "../../../../../../convex/_generated/api";
import { Button, buttonVariants } from "../../ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../../ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { ScrollArea } from "../../ui/scroll-area";
import { Textarea } from "../../ui/textarea";

function FavoriteRow({
	favorite,
	onQuickAdd,
	onUpdate,
	onDelete,
}: {
	favorite: any;
	onQuickAdd: () => void;
	onUpdate: any;
	onDelete: any;
}) {
	const [isOpen, setIsOpen] = React.useState(false);
	const [confirmOpen, setConfirmOpen] = React.useState(false);
	const [confirmRemoveOpen, setConfirmRemoveOpen] = React.useState(false);
	const [title, setTitle] = React.useState((favorite as any).title ?? "");
	const [minutes, setMinutes] = React.useState<number>(
		Math.max(0, Math.round((favorite as any).defaultDurationInMinutes ?? 10)),
	);
	const [desc, setDesc] = React.useState<string>(
		(favorite as any).description ?? "",
	);
	const [url, setUrl] = React.useState<string>(
		(favorite as any).externalUrl ?? "",
	);
	const [useCustomMinutes, setUseCustomMinutes] = React.useState<boolean>(false);
	const [customHours, setCustomHours] = React.useState<number>(
		Math.floor(Math.max(0, minutes) / 60),
	);
	const [customMinutes, setCustomMinutes] = React.useState<number>(
		Math.max(0, Math.round(minutes) % 60),
	);

	React.useEffect(() => {
		if (isOpen) {
			// Reset custom fields to reflect current minutes when opening dialog
			const h = Math.floor(Math.max(0, minutes) / 60);
			const m = Math.max(0, Math.round(minutes) % 60);
			setCustomHours(h);
			setCustomMinutes(m);
			setUseCustomMinutes(false);
		}
	}, [isOpen, minutes]);

	return (
		<li className="p-2 rounded-base border-2 border-border bg-secondary-background">
			<div className="flex items-center justify-between gap-2 sm:gap-3">
				<div className="min-w-0 flex-1">
					{(favorite as any).externalUrl ? (
						<span className="inline-flex items-center gap-1 max-w-full min-w-0">
							<a
								href={(favorite as any).externalUrl}
								target="_blank"
								rel="noreferrer"
								className="block font-bold truncate underline decoration-main text-background hover:text-background/80 max-w-[58vw] sm:max-w-[420px]"
							>
								{title || "(untitled)"}
							</a>
							<a
								href={(favorite as any).externalUrl}
								target="_blank"
								rel="noreferrer"
								aria-label="Open link"
								className="hidden sm:inline-flex text-background/80 hover:text-background flex-shrink-0"
							>
								<ExternalLink className="!size-4" />
							</a>
						</span>
					) : (
						<div className="block font-bold truncate text-background max-w-[58vw] sm:max-w-[420px]">
							{title || "(untitled)"}
						</div>
					)}
					<div className="text-xs text-background/80 flex items-center gap-2">
						<Clock className="!size-3" /> Default {minutes}m
					</div>
					{(favorite as any).description && (
						<div className="hidden sm:block text-xs text-background/70 truncate max-w-[420px]">
							{(favorite as any).description}
						</div>
					)}
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<Button
						onClick={() => setConfirmOpen(true)}
						size="sm"
						className="bg-accent bold flex items-center h-8 px-2 sm:h-9 sm:px-3 whitespace-nowrap"
					>
						Track <PlusCircle className=" !size-5 !stroke-2.5" />
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="neutral"
								size="icon"
								className="h-8 w-8 sm:h-9 sm:w-9"
							>
								<MoreHorizontal />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => setIsOpen(true)}>
								Edit
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() => onDelete({ favoriteId: (favorite as any)._id })}
							>
								Remove
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{/* Edit favorite */}
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Favorite</DialogTitle>
					</DialogHeader>
					<div className="grid gap-2">
						<Label>Title</Label>
						<Input value={title} onChange={(e) => setTitle(e.target.value)} />
					</div>
					<div className="grid gap-2 mt-2">
						<Label>Default minutes</Label>
						<div className="flex flex-wrap gap-2">
							{[5, 10, 15, 20, 25, 30, 45, 60, 90, 120].map((m) => (
								<button
									key={m}
									type="button"
									onClick={() => {
										setMinutes(m);
										setUseCustomMinutes(false);
									}}
									className={buttonVariants({
										variant:
											minutes === m && !useCustomMinutes
												? "default"
												: "neutral",
										size: "sm",
										className: "px-3",
									})}
								>
									{m >= 60
										? m % 60 === 0
											? `${m / 60}hr`
											: `${(m / 60).toFixed(1)}hr`
										: `${m}m`}
								</button>
							))}
							<button
								type="button"
								onClick={() => {
									setUseCustomMinutes(true);
									const total = customHours * 60 + customMinutes;
									setMinutes(total);
								}}
								className={buttonVariants({
									variant: useCustomMinutes ? "default" : "neutral",
									size: "sm",
									className: "px-3",
								})}
							>
								Custom
							</button>
						</div>
						{useCustomMinutes && (
							<div className="pt-1">
								<div className="inline-flex items-stretch rounded-base border-2 border-border overflow-hidden bg-white">
									<Input
										type="number"
										min={0}
										step={1}
										value={customHours}
										onChange={(e) => {
											const h = Math.max(
												0,
												Math.min(999, Number(e.target.value) || 0),
											);
											setCustomHours(h);
											const total = h * 60 + customMinutes;
											setMinutes(total);
										}}
										className="px-2 py-2 text-sm text-main-foreground w-[72px] text-center border-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none shadow-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [appearance:textfield]"
									/>
									<div className="px-0.5 py-2 text-xl text-main-foreground bg-transparent">:</div>
									<Input
										type="number"
										min={0}
										max={59}
										step={1}
										value={customMinutes}
										onChange={(e) => {
											const m = Math.max(
												0,
												Math.min(59, Number(e.target.value) || 0),
											);
											setCustomMinutes(m);
											const total = customHours * 60 + m;
											setMinutes(total);
										}}
										className="px-2 py-2 text-sm text-main-foreground w-[72px] text-center border-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none shadow-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [appearance:textfield]"
									/>
								</div>
							</div>
						)}
					</div>
					<div className="grid gap-2 mt-2">
						<Label>URL (optional)</Label>
						<Input
							placeholder="https://example.com/your-link"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
						/>
					</div>
					<div className="grid gap-2 mt-2">
						<Label>Description</Label>
						<Textarea
							value={desc}
							onChange={(e) => setDesc(e.target.value)}
							className="bg-white placeholder:text-main-foreground/70 text-main-foreground"
						/>
					</div>
					<DialogFooter>
						<Button variant="neutral" onClick={() => setIsOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={async () => {
								await onUpdate({
									favoriteId: (favorite as any)._id,
									title,
									description: desc,
									externalUrl: url || undefined,
									defaultDurationInMinutes: minutes,
								});
								setIsOpen(false);
							}}
						>
							Save
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Confirm add from favorite */}
			<Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add this record?</DialogTitle>
					</DialogHeader>
					<DialogFooter>
						<Button variant="neutral" onClick={() => setConfirmOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={() => {
								setConfirmOpen(false);
								onQuickAdd();
							}}
						>
							Add Record
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</li>
	);
}

export const FavoritesList = () => {
	const favorites = useQuery(
		api.userTargetLanguageFavoriteActivityFunctions.listFavorites,
		{},
	);
	const quickCreate = useMutation(
		api.userTargetLanguageFavoriteActivityFunctions.quickCreateFromFavorite,
	);
	const updateFavorite = useMutation(
		api.userTargetLanguageFavoriteActivityFunctions.updateFavorite,
	);
	const deleteFavorite = useMutation(
		api.userTargetLanguageFavoriteActivityFunctions.deleteFavorite,
	);

	return (
		<ScrollArea className="max-h-[60vh] h-full">
			<div>
				{!favorites && (
					<div className="flex items-center justify-center h-[300px]">
						<div className="text-center">
							<Image
								src="/cat-on-tree.png"
								alt="loading"
								className="mx-auto opacity-80"
								width={140}
								height={140}
							/>
							<div className="mt-2 text-sm text-background/80">
								Fetching your favorites…
							</div>
						</div>
					</div>
				)}
				{favorites && favorites.length === 0 && (
					<div className="flex items-center justify-center h-[300px]">
						<div className="text-center">
							<Image
								src="/cat-on-tree.png"
								alt="empty"
								className="mx-auto opacity-80"
								width={140}
								height={140}
							/>
							<div className="mt-2 text-sm text-background/80">
								No favorites yet. Use previous manual records to add favorites.
							</div>
						</div>
					</div>
				)}
				{favorites && favorites.length > 0 && (
					<ul className="space-y-2">
						{favorites.map((f: any) => (
							<FavoriteRow
								key={(f as any)._id}
								favorite={f}
								onQuickAdd={() => quickCreate({ favoriteId: (f as any)._id })}
								onUpdate={updateFavorite}
								onDelete={deleteFavorite}
							/>
						))}
					</ul>
				)}
			</div>
		</ScrollArea>
	);
};
