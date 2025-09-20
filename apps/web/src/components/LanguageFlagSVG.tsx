import * as React from "react";
import type { LanguageCode } from "../../../../convex/schema";
import { cn } from "../lib/utils";

export function LanguageFlagSVG({
	language,
	className,
}: {
	language: LanguageCode;
	className?: string;
}) {
	function starPoints(
		cx: number,
		cy: number,
		outer: number,
		inner: number,
	): string {
		const points: Array<string> = [];
		const spikes = 5;
		const step = Math.PI / spikes;
		let rot = -Math.PI / 2; // start at top
		for (let i = 0; i < spikes; i++) {
			const xOuter = cx + Math.cos(rot) * outer;
			const yOuter = cy + Math.sin(rot) * outer;
			points.push(`${xOuter},${yOuter}`);
			rot += step;
			const xInner = cx + Math.cos(rot) * inner;
			const yInner = cy + Math.sin(rot) * inner;
			points.push(`${xInner},${yInner}`);
			rot += step;
		}
		return points.join(" ");
	}
	switch (language) {
		case "ja":
			// Nisshoki (Hinomaru) - white field with red disc
			return (
				<span
					className={cn("fi fi-jp block overflow-hidden", className)}
				></span>
			);
		case "en":
			// Use US flag-like simplified design
			return (
				<span
					className={cn("fi fi-gb block overflow-hidden", className)}
				></span>
			);
		case "es":
			// Spanish flag - red-yellow-red horizontal stripes
			return (
				<span
					className={cn("fi fi-es block overflow-hidden", className)}
				></span>
			);
		case "fr":
			// French flag - blue-white-red vertical stripes
			return (
				<span
					className={cn("fi fi-fr block overflow-hidden", className)}
				></span>
			);
		case "de":
			// German flag - black-red-gold horizontal stripes
			return (
				<span
					className={cn("fi fi-de block overflow-hidden", className)}
				></span>
			);
		case "ko":
			// Korean flag - white with red and blue Taegeuk
			return (
				<span
					className={cn("fi fi-kr block overflow-hidden", className)}
				></span>
			);
		case "it":
			// Italian flag - green-white-red vertical stripes
			return (
				<span
					className={cn("fi fi-it block overflow-hidden", className)}
				></span>
			);
		case "zh": {
			// Chinese flag - red field with one large star and four smaller stars near the hoist
			return (
				<span
					className={cn("fi fi-cn block overflow-hidden", className)}
				></span>
			);
		}
		case "hi":
			// Indian flag - saffron-white-green with Ashoka Chakra
			return (
				<span
					className={cn("fi fi-in block overflow-hidden", className)}
				></span>
			);
		case "ru":
			// Russian flag - white-blue-red horizontal stripes
			return (
				<span
					className={cn("fi fi-ru block overflow-hidden", className)}
				></span>
			);
		case "ar":
			// Arabic flag - red-white-black horizontal stripes with green triangle
			return (
				<span
					className={cn("fi fi-arab block overflow-hidden", className)}
				></span>
			);
		case "pt":
			// Portuguese flag - green and red with coat of arms
			return (
				<span
					className={cn("fi fi-pt block overflow-hidden", className)}
				></span>
			);
		case "tr":
			// Turkish flag - red with white star and crescent
			return (
				<span
					className={cn("fi fi-tr block overflow-hidden", className)}
				></span>
			);
		default:
			return <>UNSUPPORTED LANGUAGE</>;
	}
}

export default LanguageFlagSVG;
