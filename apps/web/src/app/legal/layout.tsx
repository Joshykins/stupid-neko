'use client';

import Link from "next/link";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { usePathname } from "next/navigation";

export default function LegalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const activeLink: 'privacy' | 'terms' = pathname.split('/').pop() as 'privacy' | 'terms';
    return (
        <div className="my-10 mx-auto max-w-4xl text-main-foreground border-border">

            <div className="flex items-center gap-4 pb-4">
                <Link
                    href="/legal/privacy"
                >
                    <Button
                        variant={activeLink === 'privacy' ? 'default' : 'neutral'}
                        size="sm"
                    >
                        Privacy Policy
                    </Button>
                </Link>
                <Link
                    href="/legal/terms"
                >
                    <Button
                        variant={activeLink === 'terms' ? 'default' : 'neutral'}
                        size="sm"
                    >
                        Terms of Service
                    </Button>
                </Link>
            </div>
            <Card className="bg-white">
                <CardContent className="p-4">
                    {children}
                </CardContent>
            </Card>
        </div>
    );
}