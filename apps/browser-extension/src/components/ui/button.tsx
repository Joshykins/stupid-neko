import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import * as React from 'react';

import { cn } from '../../lib/utils';

const buttonVariants = cva(
	'snbex:inline-flex snbex:cursor-pointer snbex:items-center snbex:justify-center snbex:whitespace-nowrap snbex:rounded-base snbex:text-sm snbex:font-base snbex:ring-offset-white snbex:transition-all snbex:gap-2 [&_svg]:snbex:pointer-events-none [&_svg]:snbex:size-4 [&_svg]:snbex:shrink-0 snbex:focus-visible:outline-hidden snbex:focus-visible:ring-2 snbex:focus-visible:ring-black snbex:focus-visible:ring-offset-2 snbex:disabled:pointer-events-none snbex:disabled:opacity-50',
	{
		variants: {
			variant: {
				default:
					'snbex:text-white snbex:bg-main snbex:border-2 snbex:border-border snbex:shadow-shadow snbex:hover:translate-x-boxShadowX snbex:hover:translate-y-boxShadowY snbex:hover:shadow-none',
				noShadow:
					'snbex:text-main-foreground snbex:bg-main snbex:border-2 snbex:border-border',
				neutral:
					'snbex:bg-secondary-background snbex:text-background snbex:border-2 snbex:border-border snbex:shadow-shadow snbex:hover:translate-x-boxShadowX snbex:hover:translate-y-boxShadowY snbex:hover:shadow-none',
				reverse:
					'snbex:text-main-foreground snbex:bg-main snbex:border-2 snbex:border-border snbex:hover:translate-x-reverseBoxShadowX snbex:hover:translate-y-reverseBoxShadowY snbex:hover:shadow-shadow',
				destructive:
					'snbex:text-white snbex:bg-red-600 snbex:border-2 snbex:border-border snbex:shadow-shadow snbex:hover:translate-x-boxShadowX snbex:hover:translate-y-boxShadowY snbex:hover:shadow-none',
				devOnly:
					'snbex:text-white snbex:bg-dev-only snbex:border-2 snbex:border-border snbex:shadow-shadow snbex:hover:translate-x-boxShadowX snbex:hover:translate-y-boxShadowY snbex:hover:shadow-none snbex:data-[dev-hidden=true]:hidden',
				ghost:
					'snbex:text-main-foreground snbex:bg-transparent snbex:border-2 snbex:border-border snbex:hover:translate-x-boxShadowX snbex:hover:translate-y-boxShadowY snbex:hover:shadow-none',
			},
			size: {
				default: 'snbex:h-10 snbex:px-4 snbex:py-2',
				sm: 'snbex:h-9 snbex:px-3',
				lg: 'snbex:h-11 snbex:px-8',
				cta: 'snbex:h-12 snbex:px-8 snbex:text-xl',
				icon: 'snbex:size-10',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	}
);

const Button = React.forwardRef<
	React.ElementRef<'button'>,
	React.ComponentPropsWithoutRef<'button'> &
		VariantProps<typeof buttonVariants> & {
			asChild?: boolean;
		}
>(({ className, variant, size, asChild = false, ...props }, ref) => {
	const Comp = asChild ? Slot : 'button';
	const devHidden =
		variant === 'devOnly' && process.env.NODE_ENV !== 'development';

	return (
		<Comp
			ref={ref}
			data-slot="button"
			data-dev-hidden={devHidden || undefined}
			className={cn(
				buttonVariants({ variant, size, className }),
				devHidden ? 'hidden' : ''
			)}
			{...props}
		/>
	);
});

Button.displayName = 'Button';

export { Button, buttonVariants };
