'use client';
import * as React from 'react';

export function DonutCard() {
	// simple static donut using SVG to avoid extra deps
	const total = 100;
	const segments = [34, 26, 18, 22];
	const colors = ['#84cc16', '#60a5fa', '#f59e0b', '#ef4444']; // lime, blue, amber, red
	const radius = 42;
	const strokeWidth = 16;
	const circumference = 2 * Math.PI * radius;
	let offset = 0;

	return (
		<section className="bg-background border-2 border-black rounded-xl p-4 shadow-md">
			<h3 className="font-display text-xl font-black mb-2">
				Study mode breakdown
			</h3>
			<div className="flex items-center gap-4">
				<svg width="120" height="120" viewBox="0 0 120 120" aria-hidden>
					<circle
						cx="60"
						cy="60"
						r={radius}
						fill="none"
						stroke="#e5e7eb"
						strokeWidth={strokeWidth}
					/>
					{segments.map((value, i) => {
						const length = (value / total) * circumference;
						const circle = (
							<circle
								key={i}
								cx="60"
								cy="60"
								r={radius}
								fill="none"
								stroke={colors[i % colors.length]}
								strokeWidth={strokeWidth}
								strokeDasharray={`${length} ${circumference - length}`}
								strokeDashoffset={-offset}
								strokeLinecap="butt"
								transform="rotate(-90 60 60)"
							/>
						);
						offset += length;
						return circle;
					})}
					<circle
						cx="60"
						cy="60"
						r={radius - strokeWidth}
						fill="white"
						className="stroke-black"
					/>
					<text
						x="60"
						y="64"
						textAnchor="middle"
						className="font-bold"
						fontSize="14"
					>
						Weekly
					</text>
				</svg>
				<ul className="text-sm font-bold space-y-1">
					<li className="flex items-center gap-2">
						<span
							className="inline-block w-3 h-3 rounded-sm border-2 border-black"
							style={{ background: colors[0] }}
						/>
						Reviews
					</li>
					<li className="flex items-center gap-2">
						<span
							className="inline-block w-3 h-3 rounded-sm border-2 border-black"
							style={{ background: colors[1] }}
						/>
						New cards
					</li>
					<li className="flex items-center gap-2">
						<span
							className="inline-block w-3 h-3 rounded-sm border-2 border-black"
							style={{ background: colors[2] }}
						/>
						Shadowing
					</li>
					<li className="flex items-center gap-2">
						<span
							className="inline-block w-3 h-3 rounded-sm border-2 border-black"
							style={{ background: colors[3] }}
						/>
						Listening
					</li>
				</ul>
			</div>
		</section>
	);
}
