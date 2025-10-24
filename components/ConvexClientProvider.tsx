'use client';

import { ConvexAuthNextjsProvider } from '@convex-dev/auth/nextjs';
import { ConvexReactClient } from 'convex/react';
import type { ReactNode } from 'react';

const convexUrl =
	process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.EXPO_PUBLIC_CONVEX_URL;
if (!convexUrl) {
	throw new Error(
		'Convex URL missing. Set NEXT_PUBLIC_CONVEX_URL (web) or EXPO_PUBLIC_CONVEX_URL (mobile).'
	);
}
const convex = new ConvexReactClient(convexUrl);

export default function ConvexClientProvider({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<ConvexAuthNextjsProvider client={convex}>
			{children}
		</ConvexAuthNextjsProvider>
	);
}
