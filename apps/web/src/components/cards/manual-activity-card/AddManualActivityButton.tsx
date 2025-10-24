import { PlusCircle } from 'lucide-react';
import React from 'react';
import { Button } from '../../ui/button';
import { AddActivityDialog } from './AddActivityDialog';

export function AddManualActivityButton() {
	const [isDialogOpen, setIsDialogOpen] = React.useState(false);

	return (
		<>
			<Button
				size="cta"
				variant={'default'}
				className="bg-accent w-full flex-1 bold flex items-center justify-center"
				onClick={() => setIsDialogOpen(true)}
			>
				<span className="truncate">Add New</span>{' '}
				<PlusCircle className="!size-6 !stroke-2.5 ml-2 flex-shrink-0" />
			</Button>

			<AddActivityDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
		</>
	);
}
