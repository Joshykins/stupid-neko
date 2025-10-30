'use client';

import Image from 'next/image';
import Link from 'next/link';
import type * as React from 'react';
import LanguageFlagSVG from './LanguageFlagSVG';
import AppStoreCard from './marketing/AppStoreCard';
import { UnreleasedBanner } from './marketing/UnreleasedBanner';
import { Button } from './ui/button';
import { Card } from './ui/card';

function _SakuraBranch({
	className,
	style,
}: {
	className?: string;
	style?: React.CSSProperties;
}) {
	return (
		<svg
			className={className}
			style={style}
			viewBox="0 0 240 160"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden
		>
			<g
				stroke="#000"
				strokeWidth={2}
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M10 120 C80 90, 120 80, 230 30" fill="none" />
				<path d="M70 110 C90 95, 110 85, 140 70" fill="none" />
				<path d="M120 95 C140 85, 155 70, 175 60" fill="none" />
			</g>
			{/* Blossoms */}
			<g stroke="#000" strokeWidth={2}>
				<g transform="translate(70,110)">
					<circle cx="0" cy="0" r="8" fill="#F6CADA" />
					<circle cx="10" cy="-6" r="6" fill="#FCE4EF" />
					<circle cx="-9" cy="-6" r="6" fill="#FCE4EF" />
				</g>
				<g transform="translate(120,92)">
					<circle cx="0" cy="0" r="7" fill="#F6CADA" />
					<circle cx="8" cy="-6" r="5" fill="#FCE4EF" />
					<circle cx="-7" cy="-6" r="5" fill="#FCE4EF" />
				</g>
				<g transform="translate(180,68)">
					<circle cx="0" cy="0" r="7" fill="#F6CADA" />
					<circle cx="8" cy="-6" r="5" fill="#FCE4EF" />
					<circle cx="-7" cy="-6" r="5" fill="#FCE4EF" />
				</g>
			</g>
		</svg>
	);
}

function _MountainCat() {
	return (
		<svg
			viewBox="0 0 640 420"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className="w-full h-full"
			aria-hidden
		>
			{/* Mountain base */}
			<g stroke="#000" strokeWidth={3} strokeLinejoin="round">
				<path
					d="M20 360 L220 160 L300 240 L360 180 L520 360 Z"
					fill="#2C4152"
				/>
				{/* Snow caps */}
				<path d="M220 160 L260 200 L240 200 Z" fill="#FFFFFF" />
				<path d="M360 180 L330 210 L350 210 Z" fill="#FFFFFF" />
			</g>

			{/* Cat */}
			<g
				transform="translate(430,140)"
				stroke="#000"
				strokeWidth={3}
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				{/* Tail */}
				<path d="M140 120 q30 -10 40 10 q10 20 -10 30" fill="#FFE8C9" />
				{/* Body */}
				<rect x="40" y="110" width="90" height="80" rx="18" fill="#FFF6EA" />
				{/* Head */}
				<rect x="55" y="60" width="60" height="60" rx="20" fill="#FFF6EA" />
				{/* Ears */}
				<path d="M58 70 l14 -16 l14 16 Z" fill="#7A4A2B" />
				<path d="M96 70 l14 -16 l14 16 Z" fill="#7A4A2B" />
				{/* Face */}
				<circle cx="75" cy="90" r="4" fill="#000" />
				<circle cx="95" cy="90" r="4" fill="#000" />
				<path d="M80 102 q10 8 20 0" stroke="#000" />
				{/* Book */}
				<rect x="55" y="110" width="60" height="50" rx="4" fill="#F6A680" />
				<line x1="85" y1="110" x2="85" y2="160" stroke="#000" />
				{/* Paws */}
				<circle cx="70" cy="138" r="8" fill="#FFF6EA" />
				<circle cx="100" cy="138" r="8" fill="#FFF6EA" />
			</g>

			{/* Floating petals */}
			<g stroke="#000" strokeWidth={2}>
				<ellipse cx="120" cy="120" rx="6" ry="4" fill="#F6CADA" />
				<ellipse cx="180" cy="80" rx="5" ry="3" fill="#F6CADA" />
				<ellipse cx="260" cy="140" rx="6" ry="4" fill="#F6CADA" />
				<ellipse cx="400" cy="70" rx="5" ry="3" fill="#F6CADA" />
			</g>
		</svg>
	);
}

export function Hero() {
	return (
		<>
			<section className="relative pt-6 md:pt-8 pb-2 md:pb-4">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center relative">
					<div className="flex gap-4">
						<div className="flex flex-col gap-4">
							<UnreleasedBanner />

							<Card className="p-6 md:p-10 relative">
								<h1 className="font-display text-4xl md:text-6xl leading-tight md:leading-[1.03] tracking-[-0.02em] text-main-foreground">
									Do you want to{' '}
									<span className="underline decoration-4 decoration-main ">
										Auto-<i>nya</i>-tically
									</span>{' '}
									track your Progress?
								</h1>
								<p className="text-base md:text-lg font-medium text-muted-foreground max-w-prose pt-4">
									Track your language learning activities for free. Add any
									activity, <b>any language</b>, anytime, any place.
								</p>
								<div className="flex flex-col sm:flex-row gap-3 pt-4">
									<Button asChild size="cta" variant="default">
										<Link href="/sign-in">Start Tracking</Link>
									</Button>
									<Button
										asChild
										size="cta"
										className="bg-[#5865F2] text-white no-underline inline-flex items-center justify-center gap-2"
									>
										<Link
											href="https://discord.gg/dU4vMTsJU2"
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-2"
										>
											<svg
												role="img"
												viewBox="0 0 24 24"
												xmlns="http://www.w3.org/2000/svg"
												className="!h-4 !w-4 !fill-white"
												aria-hidden="true"
											>
												<title>Discord</title>
												<path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
											</svg>
											<span>Join The Discord!</span>
										</Link>
									</Button>
								</div>
								{/* Store badges moved to AppStoreCard */}
								<AppStoreCard className="p-2 w-fit h-fit md:absolute md:bottom-0 md:-right-4 md:translate-x-full" />
							</Card>
						</div>
					</div>
					<div className="hidden md:block md:h-[420px]" />
				</div>
				{/* Cat outside the card on the right */}
				<Image
					src="/cat-on-tree.png"
					alt="Cat reading on a cherry tree"
					width={720}
					height={720}
					className="pointer-events-none select-none absolute right-0 top-0 bottom-[-20px] z-20 hidden sm:block"
					priority
				/>
				<div className="flex items-center gap-4 pt-4">
					<div className="relative h-8 aspect-[4/3] rounded-md border-2 border-border/10 opacity-80 overflow-hidden">
						<LanguageFlagSVG
							language="ja"
							className="absolute inset-0 h-full !w-full"
						/>
					</div>
					<div className="relative h-8 aspect-[4/3] rounded-md border-2 border-border/10 opacity-80 overflow-hidden">
						<LanguageFlagSVG
							language="en"
							className="absolute inset-0 h-full !w-full"
						/>
					</div>
					<div className="relative h-8 aspect-[4/3] rounded-md border-2 border-border/10 opacity-80 overflow-hidden">
						<LanguageFlagSVG
							language="es"
							className="absolute inset-0 h-full !w-full"
						/>
					</div>
					<div className="relative h-8 aspect-[4/3] rounded-md border-2 border-border/10 opacity-80 overflow-hidden">
						<LanguageFlagSVG
							language="fr"
							className="absolute inset-0 h-full !w-full"
						/>
					</div>
					<div className="relative h-8 aspect-[4/3] rounded-md border-2 border-border/10 opacity-80 overflow-hidden">
						<LanguageFlagSVG
							language="de"
							className="absolute inset-0 h-full !w-full"
						/>
					</div>
					<div className="relative h-8 aspect-[4/3] rounded-md border-2 border-border/10 opacity-80 overflow-hidden">
						<LanguageFlagSVG
							language="ko"
							className="absolute inset-0 h-full !w-full"
						/>
					</div>
					<div className="relative h-8 aspect-[4/3] rounded-md border-2 border-border/10 opacity-80 overflow-hidden">
						<LanguageFlagSVG
							language="zh"
							className="absolute inset-0 h-full !w-full"
						/>
					</div>
					<div className="relative h-8 aspect-[4/3] rounded-md border-2 border-border/10 opacity-80 overflow-hidden">
						<LanguageFlagSVG
							language="hi"
							className="absolute inset-0 h-full !w-full"
						/>
					</div>
					<div className="relative h-8 aspect-[4/3] rounded-md border-2 border-border/10 opacity-80 overflow-hidden">
						<LanguageFlagSVG
							language="ru"
							className="absolute inset-0 h-full !w-full"
						/>
					</div>
					{/* And more */}
				</div>
			</section>
		</>
	);
}

export default Hero;
