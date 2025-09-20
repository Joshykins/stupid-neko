import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import * as React from "react";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
	"inline-flex items-center justify-center rounded-base border-2 border-border px-2.5 py-0.5 text-xs font-base w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] overflow-hidden",
	{
		variants: {
			variant: {
				default: "bg-accent text-background",
				neutral: "bg-secondary-background text-background",
				dark: "bg-background text-foreground",
				card: "bg-foreground text-main-foreground",
				white: "bg-white/40 text-background",
				devOnly: "bg-dev-only text-background data-[dev-hidden=true]:hidden",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

const Badge = React.forwardRef<
	React.ElementRef<"span">,
	React.ComponentPropsWithoutRef<"span"> &
	VariantProps<typeof badgeVariants> & {
		asChild?: boolean;
	}
>(({ className, variant, asChild = false, ...props }, ref) => {
	const Comp = asChild ? Slot : "span";
	const devHidden =
		variant === "devOnly" && process.env.NODE_ENV !== "development";

	return (
		<Comp
			ref={ref}
			data-slot="badge"
			data-dev-hidden={devHidden || undefined}
			className={cn(
				badgeVariants({ variant }),
				className,
				devHidden ? "hidden" : "",
			)}
			{...props}
		/>
	);
});

Badge.displayName = "Badge";

export { Badge, badgeVariants };
