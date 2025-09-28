import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import * as React from 'react';

import { cn } from '../../lib/utils';

const buttonVariants = cva(
	'inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-base text-sm font-base ring-offset-white transition-all gap-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
	{
		variants: {
			variant: {
				default:
					'text-white bg-main border-2 border-border shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none',
				noShadow: 'text-main-foreground bg-main border-2 border-border',
				neutral:
					'bg-secondary-background text-background border-2 border-border shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none',
				reverse:
					'text-main-foreground bg-main border-2 border-border hover:translate-x-reverseBoxShadowX hover:translate-y-reverseBoxShadowY hover:shadow-shadow',
				destructive:
					'text-white bg-red-600 border-2 border-border shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none',
				devOnly:
					'text-white bg-dev-only border-2 border-border shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none data-[dev-hidden=true]:hidden',
				ghost:
					'text-main-foreground bg-transparent border-2 border-border hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none',
			},
			size: {
				default: 'h-10 px-4 py-2',
				sm: 'h-9 px-3',
				lg: 'h-11 px-8',
				cta: 'h-12 px-8 text-xl',
				icon: 'size-10',
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
