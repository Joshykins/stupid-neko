import type React from 'react';

interface IconButtonProps {
	children: React.ReactNode;
	title: string;
	onClick: () => void;
	selected?: boolean;
	borderless?: boolean;
	className?: string;
}

export function IconButton({
	children,
	title,
	onClick,
	selected = false,
	borderless = false,
	className = '',
}: IconButtonProps) {
	const baseClasses =
		'snbex:inline-flex snbex:items-center snbex:justify-center snbex:cursor-pointer snbex:rounded-md snbex:transition-colors snbex:focus:outline-none';
	const borderClasses = borderless
		? '!snbex:border-transparent !snbex:ring-0'
		: 'snbex:border !snbex:border-neutral-700/50';
	const stateClasses = selected
		? borderless
			? 'snbex:bg-black/15 !snbex:border-transparent !snbex:ring-0'
			: 'snbex:border-neutral-700/50 snbex:bg-black/15'
		: '';
	const hoverClasses = 'snbex:hover:bg-black/10';
	const focusClasses = borderless
		? 'snbex:focus:bg-black/10 !snbex:focus:border-transparent !snbex:focus:ring-0'
		: 'snbex:focus:bg-black/10 snbex:focus:border-neutral-700/50';
	const spacingClasses = 'snbex:px-[4px] snbex:py-[2px]';
	const textClasses = 'snbex:text-gray-900';

	return (
		<button
			type="button"
			title={title}
			aria-label={title}
			onClick={onClick}
			className={`${baseClasses} ${borderClasses} ${stateClasses} ${hoverClasses} ${focusClasses} ${spacingClasses} ${textClasses} ${className}`}
		>
			{children}
		</button>
	);
}
