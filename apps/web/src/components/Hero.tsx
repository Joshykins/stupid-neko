"use client";
import * as React from "react";
import Link from "next/link";

import Image from "next/image";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

function SakuraBranch({ className, style }: { className?: string; style?: React.CSSProperties; }) {
	return (
		<svg
			className={className}
			style={style}
			viewBox="0 0 240 160"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden
		>
			<g stroke="#000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
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

function MountainCat() {
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
				<path d="M20 360 L220 160 L300 240 L360 180 L520 360 Z" fill="#2C4152" />
				{/* Snow caps */}
				<path d="M220 160 L260 200 L240 200 Z" fill="#FFFFFF" />
				<path d="M360 180 L330 210 L350 210 Z" fill="#FFFFFF" />
			</g>

			{/* Cat */}
			<g transform="translate(430,140)" stroke="#000" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
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
		<section className="relative pt-8 pb-4">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center relative">
				<Card className="p-10">
					<h1 className="font-display text-6xl  leading-[1.03] tracking-[-0.02em] text-main-foreground">
						Want to <span className="underline decoration-4 decoration-main ">Auto-<i>nya</i>-tically</span> track your Progress?

					</h1>
					<p className="text-lg font-medium md:text-2xl text-muted-foreground max-w-prose pt-4">
						Try out the best tracking system buit for <b>immersion learners</b>.
					</p>
					<div className="flex flex-col sm:flex-row gap-3 pt-4">
						<Button size="cta" variant="default">Start Tracking</Button>
						<Button variant="neutral" size="cta" className="text-main-foreground">Our Method</Button>
					</div>
				</Card>
				<div className="h-72 md:h-[420px]" />
			</div>
			{/* Cat outside the card on the right */}
			<Image
				src="/cat-on-tree.png"
				alt="Cat reading on a cherry tree"
				width={720}
				height={720}
				className="pointer-events-none select-none absolute right-0 top-0 bottom-[-20px] z-20 bg-pu"
				priority
			/>
		</section >
	);
}

export default Hero;


