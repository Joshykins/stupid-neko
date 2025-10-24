import { ConvexAuthProvider, type TokenStorage } from '@convex-dev/auth/react';
import { ConvexReactClient } from 'convex/react';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import type { ReactNode } from 'react';

const convexUrl =
	process.env.EXPO_PUBLIC_CONVEX_URL ||
	(Constants?.expoConfig?.extra as { EXPO_PUBLIC_CONVEX_URL?: string; })?.EXPO_PUBLIC_CONVEX_URL;
if (!convexUrl) {
	throw new Error('EXPO_PUBLIC_CONVEX_URL is not set');
}
const convex = new ConvexReactClient(convexUrl);

const storage: TokenStorage = {
	async getItem(key: string) {
		try {
			return await SecureStore.getItemAsync(key);
		} catch {
			return null;
		}
	},
	async setItem(key: string, value: string) {
		await SecureStore.setItemAsync(key, value);
	},
	async removeItem(key: string) {
		await SecureStore.deleteItemAsync(key);
	},
};

export default function ConvexClientProvider({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<ConvexAuthProvider client={convex} storage={storage}>
			{children}
		</ConvexAuthProvider>
	);
}
