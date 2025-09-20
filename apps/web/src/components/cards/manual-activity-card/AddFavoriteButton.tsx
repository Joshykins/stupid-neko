"use client";

import { History, Star } from "lucide-react";
import React from "react";
import { Button } from "../../ui/button";
import { Dialog } from "../../ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { FavoritesList } from "./FavoritesList";
import { FavoritesPotentialManualRecordsList } from "./FavoritesPotentialManualRecordsList";

export const AddFavoriteButton = () => {
	const [mode, setMode] = React.useState<"favorites" | "history">("favorites");

	return (
		<Popover>
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
								onClick={() =>
									setMode(mode === "favorites" ? "history" : "favorites")
								}
							>
								<History className="mr-1" />{" "}
								{mode === "favorites" ? "Manual Records" : "Favorites"}
							</Button>
						</div>
						{mode === "favorites" && (
							<div>
								<FavoritesList />
							</div>
						)}
						{mode === "history" && (
							<div>
								<FavoritesPotentialManualRecordsList />
							</div>
						)}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
};
