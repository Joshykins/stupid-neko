'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { User, Ban } from 'lucide-react';

export default function AccountLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const isProfile = pathname === '/account';
    const isBlacklisted = pathname?.startsWith('/account/blacklisted');

    return (
        <div>
            <div className="p-4 mt-4">
                <div className="flex gap-4 pl-20 items-center">
                    <Button asChild variant={isProfile ? 'default' : 'neutral'} className="overflow-hidden">
                        <Link href="/account">
                            <User className="mr-2 h-4 w-4" />
                            Profile
                        </Link>
                    </Button>
                    <Button asChild variant={isBlacklisted ? 'default' : 'neutral'} className="overflow-hidden ml-8">
                        <Link href="/account/blacklisted">
                            <Ban className="mr-2 h-4 w-4" />
                            Blacklisted Content
                        </Link>
                    </Button>
                </div>
            </div>
            <div>{children}</div>
        </div>
    );
}


