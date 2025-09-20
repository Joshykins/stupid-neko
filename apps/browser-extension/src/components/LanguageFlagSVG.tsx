import * as React from "react";
import type { LanguageCode } from "../../../../convex/schema";

function cn(...classes: Array<string | undefined | null | false>): string {
	return classes.filter(Boolean).join(" ");
}

export function LanguageFlagSVG({
	language,
	className,
}: {
	language: LanguageCode;
	className?: string;
}) {
	switch (language) {
		case "ja":
			return (
				<span
					className={cn(
						"fi fi-jp block !w-16 !leading-13 !overflow-hidden",
						className,
					)}
				></span>
			);
		case "en":
			return (
				<span
					className={cn(
						"fi fi-gb block !w-16 !leading-13 !overflow-hidden",
						className,
					)}
				></span>
			);
		case "es":
			return (
				<span
					className={cn(
						"fi fi-es block !w-16 !leading-13 !overflow-hidden",
						className,
					)}
				></span>
			);
		case "fr":
			return (
				<span
					className={cn(
						"fi fi-fr block !w-16 !leading-13 !overflow-hidden",
						className,
					)}
				></span>
			);
		case "de":
			return (
				<span
					className={cn(
						"fi fi-de block !w-16 !leading-13 !overflow-hidden",
						className,
					)}
				></span>
			);
		case "ko":
			return (
				<span
					className={cn(
						"fi fi-kr block !w-16 !leading-13 !overflow-hidden",
						className,
					)}
				></span>
			);
		case "it":
			return (
				<span
					className={cn(
						"fi fi-it block !w-16 !leading-13 !overflow-hidden",
						className,
					)}
				></span>
			);
		case "zh":
			return (
				<span
					className={cn(
						"fi fi-cn block !w-16 !leading-13 !overflow-hidden",
						className,
					)}
				></span>
			);
		case "hi":
			return (
				<span
					className={cn(
						"fi fi-in block !w-16 !leading-13 !overflow-hidden",
						className,
					)}
				></span>
			);
		case "ru":
			return (
				<span
					className={cn(
						"fi fi-ru block !w-16 !leading-13 !overflow-hidden",
						className,
					)}
				></span>
			);
		case "ar":
			return (
				<span
					className={cn(
						"fi fi-arab block !w-16 !leading-13 !overflow-hidden",
						className,
					)}
				></span>
			);
		case "pt":
			return (
				<span
					className={cn(
						"fi fi-pt block !w-16 !leading-13 !overflow-hidden",
						className,
					)}
				></span>
			);
		case "tr":
			return (
				<span
					className={cn(
						"fi fi-tr block !w-16 !leading-13 !overflow-hidden",
						className,
					)}
				></span>
			);
		default:
			return <>UNSUPPORTED LANGUAGE</>;
	}
}

export default LanguageFlagSVG;
