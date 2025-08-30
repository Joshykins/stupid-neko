"use client";
import * as React from "react";


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

    const circle = (
        <span
            aria-hidden
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-black shadow-[3px_3px_0_0_#000] overflow-hidden"
        >
            <span
                className="h-full w-full"
                style={{
                    background: `linear-gradient(180deg, var(--foreground) 50%, var(--background) 50%)`,
                    display: "block",
                }}
            />
        </span>
    );

    return (
        <button
            type="button"
            onClick={toggle}
            aria-label="Toggle theme"
            className="bg-muted px-2 py-2 rounded-md border-2 border-black hover:translate-x-[2px] hover:translate-y-[2px] transition-transform"
        >
            {circle}
        </button>
    );
}

export default ThemeToggle;


