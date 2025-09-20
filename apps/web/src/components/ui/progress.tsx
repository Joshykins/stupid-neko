import * as ProgressPrimitive from "@radix-ui/react-progress";

import type * as React from "react";

import { cn } from "@/lib/utils";

function Progress({
	className,
	value,
	indicatorColor,
	showBubble,
	bubble,
	...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
	value?: number;
	indicatorColor?: string;
	showBubble?: boolean;
	bubble?: React.ReactNode;
}) {
	const clamped = Math.max(0, Math.min(100, value || 0));
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
					transform: `translateX(-${100 - clamped}%)`,
					backgroundColor: indicatorColor,
				}}
			/>
			{showBubble && (
				<div
					className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
					style={{ left: `${clamped}%` }}
				>
					{bubble}
				</div>
			)}
		</ProgressPrimitive.Root>
	);
}

export { Progress };
