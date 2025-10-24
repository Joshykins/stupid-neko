'use client';

import { Card } from '../../ui/card';
import { AddFavoriteButton } from './AddFavoriteButton';
import { AddManualActivityButton } from './AddManualActivityButton';

export const AddManualActvitiyCard = () => {

	return (
		<Card className="p-4">
			<h1 className="font-display text-4xl md:text-2xl pb-2 leading-tight md:leading-[1.03] tracking-[-0.02em] text-main-foreground">
				Add a{' '}
				<span className="underline decoration-4 decoration-main italic">
					manual
				</span>{' '}
				language activity.
			</h1>
			<p className="text-sm text-muted-foreground pb-6">
				This is useful for activities that can&apos;t be tracked automatically.
			</p>
			<div className="flex gap-3 w-full">
				<AddManualActivityButton />
				<AddFavoriteButton />
			</div>
		</Card>
	);
};
