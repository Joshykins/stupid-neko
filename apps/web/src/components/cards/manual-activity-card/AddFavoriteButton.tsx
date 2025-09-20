"use client";

import { History, Star } from "lucide-react";
import React from "react";
import { Button } from "../../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { FavoritesList } from "./FavoritesList";
import { FavoritesPotentialManualRecordsList } from "./FavoritesPotentialManualRecordsList";


type AddFavoriteButtonProps = {
	onFavoriteAutoFill?: (favorite: any) => void;
};

export const AddFavoriteButton = ({ onFavoriteAutoFill }: AddFavoriteButtonProps = {}) => {
	const [mode, setMode] = React.useState<"favorites" | "history">("favorites");
	const [isOpen, setIsOpen] = React.useState(false);

	// Reset to favorites tab whenever popover opens
	React.useEffect(() => {
		if (isOpen) {
			setMode("favorites");
		}
	}, [isOpen]);

	// Handle favorite auto-fill and close popover
	const handleFavoriteAutoFill = React.useCallback((favorite: any) => {
		if (onFavoriteAutoFill) {
			onFavoriteAutoFill(favorite);
			setIsOpen(false); // Close the popover
		}
	}, [onFavoriteAutoFill]);

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button
					onClick={() => {
						/* handled by PopoverTrigger */
					}}
					size="cta"
					variant={"neutral"}
					className="px-2 bold flex items-center justify-center"
				>
					<Star className="!size-6 fill-yellow-300 stroke-border" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				side="bottom"
				sideOffset={10}
				align="start"
				className="w-[min(92vw,48rem)] p-4 "
			>
				<div className="max-w-3xl">
					<div className="">
						<div className="pb-4 flex items-start justify-between gap-2">
							<div>
								<div className="flex items-center mb-1 text-lg font-semibold text-background">
									<Star className="mr-2 !size-6 fill-yellow-300 stroke-border" />{" "}
									Add From Favorite
								</div>
							</div>
							{/* Toggle button */}
							<Button
								className="bg-secondary-background text-background"
								onClick={() =>
									setMode(mode === "favorites" ? "history" : "favorites")
								}
							>
								{mode === "favorites" ? "Manual Records" : "Favorites"}
								{" "}
								<History className="ml-1" />

							</Button>
						</div>
						{mode === "favorites" && (
							<FavoritesList onAutoFill={handleFavoriteAutoFill} />
						)}
						{mode === "history" && (
							<FavoritesPotentialManualRecordsList onFavoriteAdded={() => setMode("favorites")} />
						)}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
};
