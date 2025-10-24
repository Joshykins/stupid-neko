'use client';

import { History, Star } from 'lucide-react';
import React from 'react';
import { Button } from '../../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { FavoritesList } from './FavoritesList';
import { FavoritesPotentialManualRecordsList } from './FavoritesPotentialManualRecordsList';
import { AddActivityDialog } from './AddActivityDialog';

type FavoriteData = {
	title: string;
	description?: string;
	externalUrl?: string;
	defaultDurationInMs: number;
};

export const AddFavoriteButton = () => {
	const [mode, setMode] = React.useState<'favorites' | 'history'>('favorites');
	const [isOpen, setIsOpen] = React.useState(false);
	const [isDialogOpen, setIsDialogOpen] = React.useState(false);
	const [selectedFavorite, setSelectedFavorite] =
		React.useState<FavoriteData | null>(null);

	// Reset to favorites tab whenever popover opens
	React.useEffect(() => {
		if (isOpen) {
			setMode('favorites');
		}
	}, [isOpen]);

	// Handle favorite selection and open dialog
	const handleFavoriteSelect = React.useCallback((favorite: FavoriteData) => {
		setSelectedFavorite(favorite);
		setIsOpen(false); // Close the popover
		setIsDialogOpen(true); // Open the dialog
	}, []);

	return (
		<>
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<Button
						onClick={() => {
							/* handled by PopoverTrigger */
						}}
						size="cta"
						variant={'neutral'}
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
										<Star className="mr-2 !size-6 fill-yellow-300 stroke-border" />{' '}
										Add From Favorite
									</div>
								</div>
								{/* Toggle button */}
								<Button
									className="bg-secondary-background text-background"
									onClick={() =>
										setMode(mode === 'favorites' ? 'history' : 'favorites')
									}
								>
									{mode === 'favorites' ? 'Manual Records' : 'Favorites'}{' '}
									<History className="ml-1" />
								</Button>
							</div>
							{mode === 'favorites' && (
								<FavoritesList
									onAutoFill={favorite =>
										handleFavoriteSelect(favorite as FavoriteData)
									}
								/>
							)}
							{mode === 'history' && (
								<FavoritesPotentialManualRecordsList
									onFavoriteAdded={() => setMode('favorites')}
								/>
							)}
						</div>
					</div>
				</PopoverContent>
			</Popover>

			<AddActivityDialog
				open={isDialogOpen}
				onOpenChange={open => {
					setIsDialogOpen(open);
					if (!open) {
						setSelectedFavorite(null);
					}
				}}
				autoFillData={selectedFavorite}
			/>
		</>
	);
};
