import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
	name: "Stupid Neko",
	slug: "mobile",
	scheme: "stupidneko",
	version: "0.1.0",
	orientation: "portrait",
	updates: {
		fallbackToCacheTimeout: 0,
	},
	assetBundlePatterns: ["**/*"],
	ios: {
		supportsTablet: true,
	},
	android: {},
	web: {},
	extra: {
		EXPO_PUBLIC_CONVEX_URL: process.env.EXPO_PUBLIC_CONVEX_URL,
		EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY:
			process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
	},
};

export default config;
