// Removed Clerk provider in favor of Convex Auth
import { Slot } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import ConvexClientProvider from '../components/ConvexClientProvider';

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
	return (
		<ConvexClientProvider>
			<Slot />
		</ConvexClientProvider>
	);
}
