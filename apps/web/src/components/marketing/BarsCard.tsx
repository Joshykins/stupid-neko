"use client";
import * as React from "react";

export function BarsCard() {
	const bars = [4, 7, 3, 9, 5, 2, 6];
	const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
	const max = Math.max(...bars) || 1;
	return (
		<section className="bg-background border-2 border-black rounded-xl p-4 shadow-md">
			<h3 className="font-display text-xl font-black mb-2">
				Weekly distribution
			</h3>
			<div className="grid grid-cols-7 gap-2 items-end h-28">
				{bars.map((v, i) => (
					<div key={i} className="flex flex-col items-center gap-1">
						<div
							className="w-full bg-primary border-2 border-black shadow-[2px_2px_0_0_#000]"
							style={{ height: `${(v / max) * 100}%` }}
						/>
						<span className="text-xs font-bold text-muted-foreground">
							{labels[i]}
						</span>
					</div>
				))}
			</div>
		</section>
	);
}
