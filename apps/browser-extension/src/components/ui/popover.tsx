import * as PopoverPrimitive from '@radix-ui/react-popover';

import type * as React from 'react';

import { cn } from '../../lib/utils';

function Popover({
	...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
	return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
	...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
	return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
	className,
	align = 'center',
	sideOffset = 8,
	children,
	...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
	return (
		<PopoverPrimitive.Portal
			container={
				(window as unknown as Record<string, unknown>).__stupidNekoPortalEl as
				| HTMLElement
				| undefined
			}
		>
			<PopoverPrimitive.Content
				align={align}
				sideOffset={sideOffset}
				forceMount={true}
				collisionPadding={8}
				sticky="partial"
				{...props}
			>
				<div
					data-slot="popover-content"
					className={cn(
						'snbex:z-[2147483647] snbex:w-80 snbex:rounded-base snbex:border-2 snbex:border-border snbex:bg-foreground snbex:p-4 snbex:text-main-foreground snbex:font-base snbex:outline-none snbex:shadow-shadow snbex:data-[state=open]:animate-in snbex:data-[state=closed]:animate-out snbex:data-[state=closed]:fade-out-0 snbex:data-[state=open]:fade-in-0 snbex:data-[state=closed]:zoom-out-95 snbex:data-[state=open]:zoom-in-95 snbex:data-[side=bottom]:slide-in-from-top-2 snbex:data-[side=left]:slide-in-from-right-2 snbex:data-[side=right]:slide-in-from-left-2 snbex:data-[side=top]:slide-in-from-bottom-2 snbex:origin-(--radix-popover-content-transform-origin)',
						className
					)}
					style={{
						zIndex: 2147483647,
						pointerEvents: 'auto',
					}}
				>
					{children}
				</div>
			</PopoverPrimitive.Content>
		</PopoverPrimitive.Portal>
	);
}

export { Popover, PopoverTrigger, PopoverContent };
export const PopoverAnchor = PopoverPrimitive.Anchor;
