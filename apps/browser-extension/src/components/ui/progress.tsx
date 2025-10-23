import * as ProgressPrimitive from '@radix-ui/react-progress';

import type * as React from 'react';
import { cn } from '../../lib/utils';

function Progress({
	className,
	value,
	indicatorColor,
	...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
	value?: number;
	indicatorColor?: string;
}) {
	return (
		<ProgressPrimitive.Root
			data-slot="progress"
			className={cn(
				'snbex:relative snbex:h-4 snbex:w-full snbex:overflow-hidden snbex:rounded-base snbex:border-2 snbex:border-border snbex:bg-secondary-background',
				className
			)}
			{...props}
		>
			<ProgressPrimitive.Indicator
				data-slot="progress-indicator"
				className="snbex:h-full snbex:w-full snbex:flex-1 snbex:border-r-2 snbex:border-border snbex:bg-main snbex:transition-transform snbex:duration-700 snbex:ease-out"
				style={{
					transform: `translateX(-${100 - (value || 0)}%)`,
					backgroundColor: indicatorColor,
				}}
			/>
		</ProgressPrimitive.Root>
	);
}

export { Progress };
