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
				'flex h-[42px] w-full rounded-[12px] border-2 border-[#D9D3C7] bg-white selection:bg-black selection:text-white px-[14px] py-[10px] text-[14px] leading-[20px] text-[#0F172A]',
				'placeholder:text-[#0F172A]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
				className as any
			)}
			{...props}
		/>
	);
}

export { Input };
