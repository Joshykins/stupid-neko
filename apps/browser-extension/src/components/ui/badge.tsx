import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import * as React from 'react';

import { cn } from '../../lib/utils';

const badgeVariants = cva(
	'snbex:inline-flex snbex:items-center snbex:justify-center snbex:rounded-base snbex:border-2 snbex:border-border snbex:px-2.5 snbex:py-0.5 snbex:text-xs snbex:font-base snbex:w-fit snbex:whitespace-nowrap snbex:shrink-0 [&>svg]:snbex:size-3 snbex:gap-1 [&>svg]:snbex:pointer-events-none focus-visible:snbex:border-ring focus-visible:snbex:ring-ring/50 focus-visible:snbex:ring-[3px] snbex:overflow-hidden',
	{
		variants: {
			variant: {
				default: 'snbex:bg-accent snbex:text-background',
				neutral: 'snbex:bg-secondary-background snbex:text-background',
				dark: 'snbex:bg-background snbex:text-foreground',
				card: 'snbex:bg-foreground snbex:text-main-foreground',
				white: 'snbex:bg-white/40 snbex:text-background',
				devOnly: 'snbex:bg-dev-only snbex:text-background data-[dev-hidden=true]:snbex:hidden',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	}
);

const Badge = React.forwardRef<
	React.ElementRef<'span'>,
	React.ComponentPropsWithoutRef<'span'> &
	VariantProps<typeof badgeVariants> & {
		asChild?: boolean;
	}
>(({ className, variant, asChild = false, ...props }, ref) => {
	const Comp = asChild ? Slot : 'span';
	const devHidden =
		variant === 'devOnly' && process.env.NODE_ENV !== 'development';

	return (
		<Comp
			ref={ref}
			data-slot="badge"
			data-dev-hidden={devHidden || undefined}
			className={cn(
				badgeVariants({ variant }),
				className,
				devHidden ? 'hidden' : ''
			)}
			{...props}
		/>
	);
});

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
