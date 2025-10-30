import Link from 'next/link';

export function Footer() {
	const year = new Date().getFullYear();

	return (
		<footer className="pb-6 absolute left-0 right-0 bottom-0 p-4">
			<div className="flex flex-col gap-4 text-white/50 font-medium text-sm md:flex-row md:items-center md:justify-between">
				<p>© {year} StupidNeko. All rights reserved.</p>
				<div className="flex items-center gap-4">
					<Link href="/legal/privacy" className="hover:text-white">
						Privacy
					</Link>
					<Link href="/legal/terms" className="hover:text-white">
						Terms
					</Link>
				</div>
			</div>
		</footer>
	);
}

export default Footer;
