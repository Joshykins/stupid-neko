import { ClerkProvider } from "@clerk/clerk-expo";
import { Slot } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React from "react";
import ConvexClientProvider from "../components/ConvexClientProvider";

const tokenCache = {
	async getToken(key: string) {
		try {
			return await SecureStore.getItemAsync(key);
		} catch {
			return null;
		}
	},
	async saveToken(key: string, value: string) {
		try {
			await SecureStore.setItemAsync(key, value);
		} catch {}
	},
};

export default function RootLayout() {
	const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY as
		| string
		| undefined;
	if (!publishableKey) {
		console.warn("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY");
	}
	return (
		<ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
			<ConvexClientProvider>
				<Slot />
			</ConvexClientProvider>
		</ClerkProvider>
	);
}
