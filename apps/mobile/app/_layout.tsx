// Removed Clerk provider in favor of Convex Auth
import { Slot } from 'expo-router';
import React from 'react';
import ConvexClientProvider from '../components/ConvexClientProvider';

export default function RootLayout() {
	return (
		<ConvexClientProvider>
			<Slot />
		</ConvexClientProvider>
	);
}
