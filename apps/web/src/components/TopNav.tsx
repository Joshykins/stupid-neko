"use client";

import * as React from "react";
import { useEffect } from "react";
import Link from "next/link";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

import { Card } from "./ui/card";
import { Button } from "./ui/button";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "./ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { useAuthActions } from "@convex-dev/auth/react";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";


const plainRoutes = ["/get-started", "/sign-in"];


export function TopNav() {
    const pathname = usePathname();
    const isPlain = plainRoutes.includes(pathname ?? "");

    const me = useQuery(api.meFunctions.me, {});
    const { signOut } = useAuthActions();
    const updateTimezone = useMutation(api.meFunctions.updateTimezone);

    // Auto-detect and update timezone every time the user accesses the website
    useEffect(() => {
        if (me) {
            const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            // Only update if the timezone has changed
            if (me.timezone !== currentTimezone) {
                updateTimezone({ timezone: currentTimezone });
            }
        }
    }, [me, updateTimezone]);



    const links = [
        { href: "/our-method", label: "Our Method" },
        { href: "/integrations", label: "Integrations" },
        { href: "/library", label: "Library" },
    ];

    return (
        <>
            {isPlain ? null : <header className="sticky top-4 z-50 w-full">
                <Card className="px-4 py-2">
                    <div className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <Link href="/" className="no-underline">
                                <span className="font-display text-3xl font-black leading-[1.03] tracking-[-0.02em]  text-heading text-main-foreground">StupidNeko</span>
                            </Link>
                            <nav className="hidden md:flex items-center gap-8 ml-4 text-base">
                                <Authenticated>
                                    <Link
                                        href="/dashboard"
                                        aria-current={pathname?.startsWith("/dashboard") ? "page" : undefined}
                                        className={[
                                            "text-background/90 font-sans text-xl font-bold transition-colors",
                                            pathname?.startsWith("/dashboard")
                                                ? "relative text-background after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-3 after:h-1 after:bg-background after:rounded-full after:origin-left "
                                                : "hover:text-background relative after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-3 after:h-1 after:bg-background after:rounded-full after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform after:duration-200",
                                        ]
                                            .filter(Boolean)
                                            .join(" ")}
                                    >
                                        Dashboard
                                    </Link>
                                </Authenticated>
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
                            {/* <ThemeToggle /> */}
                            <AuthLoading>{null}</AuthLoading>
                            <Unauthenticated>

                                <Button asChild size="default" variant="default">
                                    <Link href="/sign-in" className="no-underline">Start Tracking</Link>
                                </Button>
                            </Unauthenticated>
                            <Authenticated>
                                <div className="gap-2 flex items-center">
                                    <Link href="/dashboard"> <Button variant={"default"} size="sm" >Dashboard</Button></Link>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="reverse" size="icon" className="rounded-full p-0">
                                                <Avatar className="size-9">
                                                    <AvatarImage src={me?.image ?? undefined} alt={me?.name ?? "User"} />
                                                    <AvatarFallback>{(me?.name ?? "U").slice(0, 1)}</AvatarFallback>
                                                </Avatar>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56">
                                            <DropdownMenuLabel>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="size-7">
                                                        <AvatarImage src={me?.image ?? undefined} alt={me?.name ?? "User"} />
                                                        <AvatarFallback>{(me?.name ?? "U").slice(0, 1)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-heading">{me?.name ?? "Account"}</div>
                                                    </div>
                                                </div>
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem asChild>
                                                <Link href="/account">My account</Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href="/dashboard">Dashboard</Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onSelect={(e) => {
                                                    e.preventDefault();
                                                    void signOut();
                                                }}
                                            >
                                                Sign out
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </Authenticated>
                        </div>
                    </div>
                </Card>
            </header>}
        </>
    );
}

export default TopNav;
