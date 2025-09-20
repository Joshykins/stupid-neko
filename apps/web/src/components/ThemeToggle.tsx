"use client";
import * as React from "react";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";

export function ThemeToggle() {
	const [theme, setTheme] = React.useState<"light" | "dark">("dark");

	React.useEffect(() => {
		try {
			const stored = localStorage.getItem("theme");
			if (stored === "light" || stored === "dark") {
				setTheme(stored);
				return;
			}
			setTheme("light"); // default brand look
		} catch {}
	}, []);

	React.useEffect(() => {
		try {
			document.documentElement.dataset.theme = theme;
			localStorage.setItem("theme", theme);
		} catch {}
	}, [theme]);

	const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

	const topCircle = (
		<span
			className={cn(
				"h-full w-full rounded-t-full transition-all duration-300",
				theme === "dark" && "bg-[#4B7295]",
				theme === "light" && "bg-main",
			)}
		/>
	);

	const bottomCircle = (
		<span
			className={cn(
				"h-full w-full rounded-b-full transition-all duration-300",
				theme === "dark" && "bg-[#0E1B34]",
				theme === "light" && "bg-[#4B7295]",
			)}
		/>
	);

	return (
		<Button
			variant={"neutral"}
			size="icon"
			onClick={toggle}
			aria-label="Toggle theme"
			className="rounded-full flex flex-col gap-0 divide-y-2 divide-border"
		>
			{topCircle}
			{bottomCircle}
		</Button>
	);
}

export default ThemeToggle;
