"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

import { Card } from "./ui/card";
import { Button } from "./ui/button";


export function TopNav() {
    const pathname = usePathname();

    const links = [
        { href: "/Dashboard", label: "Dashboard" },
        { href: "/our-method", label: "Our Method" },
        { href: "/integrations", label: "Integrations" },
        { href: "/library", label: "Library" },
    ];

    return (

        <>
            <header className="sticky top-4 z-50 w-full">
                <Card className="px-4 py-2">
                    <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <Link href="/" className="no-underline">
                                <span className="font-display text-3xl font-black leading-[1.03] tracking-[-0.02em]  text-heading text-main-foreground">StupidNeko</span>
                            </Link>
                            <nav className="hidden md:flex items-center gap-8 ml-4 text-base">
                                {links.map((l) => {
                                    const isActive = pathname?.startsWith(l.href);
                                    return (
                                        <Link
                                            key={l.href}
                                            href={l.href}
                                            aria-current={isActive ? "page" : undefined}
                                            className={[
                                                "text-background/90 font-sans text-xl font-bold transition-colors",
                                                isActive
                                                    ? "relative text-background after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-3 after:h-1 after:bg-background after:rounded-full after:origin-left "
                                                    : "hover:text-background relative after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-3 after:h-1 after:bg-background after:rounded-full after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform after:duration-200",
                                            ]
                                                .filter(Boolean)
                                                .join(" ")}
                                        >
                                            {l.label}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>

                        <div className="flex items-center gap-2">
                            <SignedOut>
                                <Button asChild size="default" variant="default">
                                    <Link href="/get-started" className="no-underline">Start Tracking</Link>
                                </Button>
                            </SignedOut>
                            <SignedIn>
                                <Link href="/new" className="px-3 py-2 rounded-sm border-2 border-black bg-primary text-primary-foreground shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-transform">Add tracked item</Link>
                                <UserButton afterSignOutUrl="/" />
                            </SignedIn>
                        </div>
                    </div>
                </Card>
            </header>
        </>
    );
}

export default TopNav;


