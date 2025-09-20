import Link from "next/link";
import { Card } from "./ui/card";

export function Footer() {
	const year = new Date().getFullYear();

	return (
		<footer className="pb-6">
			<Card className="px-4 py-8">
				<div className="flex flex-col gap-4 border-t border-border pt-6 text-background/70 text-sm md:flex-row md:items-center md:justify-between">
					<p>© {year} StupidNeko. All rights reserved.</p>
					<div className="flex items-center gap-4">
						<Link href="/privacy" className="hover:text-background">
							Privacy
						</Link>
						<Link href="/terms" className="hover:text-background">
							Terms
						</Link>
					</div>
				</div>
			</Card>
		</footer>
	);
}

export default Footer;
