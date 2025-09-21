import type React from "react";

interface IconButtonProps {
    children: React.ReactNode;
    title: string;
    onClick: () => void;
    selected?: boolean;
    borderless?: boolean;
    className?: string;
}

export function IconButton({
    children,
    title,
    onClick,
    selected = false,
    borderless = false,
    className = "",
}: IconButtonProps) {
    const baseClasses = "inline-flex items-center justify-center cursor-pointer rounded-md transition-colors";
    const borderClasses = borderless
        ? "border border-transparent"
        : "border !border-neutral-700/50";
    const stateClasses = selected
        ? (borderless ? "bg-black/15" : "border-neutral-700/50 bg-black/15")
        : "";
    const hoverClasses = "hover:bg-black/10";
    const spacingClasses = "px-[4px] py-[2px]";
    const textClasses = "text-gray-900";

    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            onClick={onClick}
            className={`${baseClasses} ${borderClasses} ${stateClasses} ${hoverClasses} ${spacingClasses} ${textClasses} ${className}`}
        >
            {children}
        </button>
    );
}
