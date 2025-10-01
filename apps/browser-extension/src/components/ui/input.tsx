import type * as React from 'react';

function cx(...classes: Array<string | false | null | undefined>) {
	return classes.filter(Boolean).join(' ');
}

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cx(
				// Keep styles inline to avoid relying on web app utilities; use px not rem
				'snbex:flex snbex:h-[42px] snbex:w-full snbex:rounded-[12px] snbex:border-2 snbex:border-[#D9D3C7] snbex:bg-white snbex:selection:bg-black snbex:selection:text-white snbex:px-[14px] snbex:py-[10px] snbex:text-[14px] snbex:leading-[20px] snbex:text-[#0F172A]',
				'snbex:placeholder:text-[#0F172A]/60 snbex:focus-visible:outline-none snbex:focus-visible:ring-2 snbex:focus-visible:ring-black snbex:focus-visible:ring-offset-2 snbex:disabled:cursor-not-allowed snbex:disabled:opacity-50',
				className as any
			)}
			{...props}
		/>
	);
}

export { Input };
