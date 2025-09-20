import * as ProgressPrimitive from "@radix-ui/react-progress";

import type * as React from "react";
import { cn } from "../../lib/utils";

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
				"relative h-4 w-full overflow-hidden rounded-base border-2 border-border bg-secondary-background",
				className,
			)}
			{...props}
		>
			<ProgressPrimitive.Indicator
				data-slot="progress-indicator"
				className="h-full w-full flex-1 border-r-2 border-border bg-main transition-transform duration-700 ease-out"
				style={{
					transform: `translateX(-${100 - (value || 0)}%)`,
					backgroundColor: indicatorColor,
				}}
			/>
		</ProgressPrimitive.Root>
	);
}

export { Progress };
