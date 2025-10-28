'use client';

import { useAuthActions } from '@convex-dev/auth/react';
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
	useMutation,
	useQuery,
} from 'convex/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { api } from '../../../../convex/_generated/api';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from './ui/dropdown-menu';

const plainRoutes = ['/get-started', '/sign-in'];

export function TopNav() {
	const pathname = usePathname();
	const isPlain = plainRoutes.includes(pathname ?? '');

	if (isPlain) {
		return null;
	}

	return <TopNavContent />;
}

function TopNavContent() {
	const me = useQuery(api.userFunctions.me, {});
	const { signOut } = useAuthActions();
	const updateTimezone = useMutation(api.userFunctions.updateTimezone);

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

	// const links = [{ href: '/our-method', label: 'Our Method' }].filter(link => {
	// 	// Hide integrations link when authenticated
	// 	if (link.href === '/integrations' && me) {
	// 		return false;
	// 	}
	// 	return true;
	// });

	const pathname = usePathname();

	return (
		<header className="sticky top-4 z-50 w-full">
			<Card className="px-4 py-2">
				<div className="flex items-center justify-between gap-6">
					<div className="flex items-center gap-3">
						<Link href="/" className="no-underline">
							<span className="font-display text-3xl font-black leading-[1.03] tracking-[-0.02em]  text-heading text-main-foreground">
								StupidNeko
							</span>
						</Link>
						<nav className="hidden md:flex items-center gap-8 ml-4 text-base">
							<Authenticated>
								<Link
									href="/dashboard"
									aria-current={
										pathname?.startsWith('/dashboard') ? 'page' : undefined
									}
									className={[
										'text-background/90 font-sans text-xl font-bold transition-colors',
										pathname?.startsWith('/dashboard')
											? "relative text-background after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-3 after:h-1 after:bg-background after:rounded-full after:origin-left "
											: "hover:text-background relative after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-3 after:h-1 after:bg-background after:rounded-full after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform after:duration-200",
									]
										.filter(Boolean)
										.join(' ')}
								>
									Dashboard
								</Link>
							</Authenticated>
							{/* {links.map(l => {
								const isActive = pathname?.startsWith(l.href);
								return (
									<Link
										key={l.href}
										href={l.href}
										aria-current={isActive ? 'page' : undefined}
										className={[
											'text-background/90 font-sans text-xl font-bold transition-colors',
											isActive
												? "relative text-background after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-3 after:h-1 after:bg-background after:rounded-full after:origin-left "
												: "hover:text-background relative after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-3 after:h-1 after:bg-background after:rounded-full after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform after:duration-200",
										]
											.filter(Boolean)
											.join(' ')}
									>
										{l.label}
									</Link>
								);
							})} */}
						</nav>
					</div>

					<div className="flex items-center gap-2">
						{/* <ThemeToggle /> */}
						<AuthLoading>{null}</AuthLoading>
						<Unauthenticated>
							<Button
								asChild
								// size="lg"
								variant="reverse"
								className="w-full bg-[#5865F2] text-white no-underline inline-flex items-center justify-center gap-2"
							>
								<Link
									href="https://discord.gg/dU4vMTsJU2"
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-2"
								>
									<svg
										role="img"
										viewBox="0 0 24 24"
										xmlns="http://www.w3.org/2000/svg"
										className="!h-4 !w-4 !fill-white"
										aria-hidden="true"
									>
										<title>Discord</title>
										<path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
									</svg>
									<span>Discord</span>
								</Link>
							</Button>
							<Button asChild size="default" variant="default">
								<Link href="/sign-in" className="no-underline">
									Start Tracking
								</Link>
							</Button>
						</Unauthenticated>
						<Authenticated>
							<div className="gap-2 flex items-center">
								<Link href="/dashboard">
									{' '}
									<Button variant={'default'} size="sm">
										Dashboard
									</Button>
								</Link>

								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="reverse"
											size="icon"
											className="rounded-full p-0"
										>
											<Avatar className="size-9">
												<AvatarImage
													src={me?.image ?? undefined}
													alt={me?.name ?? 'User'}
												/>
												<AvatarFallback>
													{(me?.name ?? 'U').slice(0, 1)}
												</AvatarFallback>
											</Avatar>
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-56">
										<DropdownMenuLabel>
											<div className="flex items-center gap-2">
												<Avatar className="size-7">
													<AvatarImage
														src={me?.image ?? undefined}
														alt={me?.name ?? 'User'}
													/>
													<AvatarFallback>
														{(me?.name ?? 'U').slice(0, 1)}
													</AvatarFallback>
												</Avatar>
												<div className="min-w-0">
													<div className="truncate text-sm font-heading">
														{me?.name ?? 'Account'}
													</div>
												</div>
											</div>
										</DropdownMenuLabel>
										<DropdownMenuSeparator />
										<DropdownMenuItem asChild>
											<Link href="/account">My account</Link>
										</DropdownMenuItem>
										<DropdownMenuItem asChild>
											<Link href="/account/content-policies">
												Content policies
											</Link>
										</DropdownMenuItem>
										<DropdownMenuItem asChild>
											<Link href="/dashboard">Dashboard</Link>
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											onSelect={e => {
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
		</header>
	);
}

export default TopNav;
