"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";

const convexUrl =
	process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.EXPO_PUBLIC_CONVEX_URL;
if (!convexUrl) {
	throw new Error(
		"Convex URL missing. Set NEXT_PUBLIC_CONVEX_URL (web) or EXPO_PUBLIC_CONVEX_URL (mobile).",
	);
}
const convex = new ConvexReactClient(convexUrl);

export default function ConvexClientProvider({
	children,
}: {
	children: ReactNode;
}) {
	return <ConvexAuthNextjsProvider client={convex}>{children}</ConvexAuthNextjsProvider>;
}
