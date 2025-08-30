import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/clerk-expo";
import Constants from "expo-constants";

const convexUrl =
  process.env.EXPO_PUBLIC_CONVEX_URL ||
  (Constants?.expoConfig?.extra as any)?.EXPO_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("EXPO_PUBLIC_CONVEX_URL is not set");
}
const convex = new ConvexReactClient(convexUrl);

export default function ConvexClientProvider({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
			{children}
		</ConvexProviderWithClerk>
	);
}


