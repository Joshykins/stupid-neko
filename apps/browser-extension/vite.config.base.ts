import type { ManifestV3Export } from '@crxjs/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { type BuildOptions, defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { crxI18n, stripDevIcons } from './custom-vite-plugins';
import devManifest from './manifest.dev.json';
import manifest from './manifest.json';
import pkg from './package.json';

const isDev = process.env.__DEV__ === 'true';
// set this flag to true, if you want localization support
const localize = false;

export const baseManifest = {
	...manifest,
	version: pkg.version,
	...(isDev ? devManifest : ({} as ManifestV3Export)),
	...(localize
		? {
				name: '__MSG_extName__',
				description: '__MSG_extDescription__',
				default_locale: 'en',
			}
		: {}),
} as ManifestV3Export;

export const baseBuildOptions: BuildOptions = {
	sourcemap: isDev,
	emptyOutDir: !isDev,
};

export default defineConfig({
	plugins: [
		tailwindcss(),
		tsconfigPaths(),
		react(),
		stripDevIcons(isDev),
		crxI18n({ localize, src: './src/locales' }),
	],
	publicDir: resolve(__dirname, 'public'),
	define: {
		CONVEX_SITE_URL: JSON.stringify(process.env.CONVEX_SITE_URL || ''),
		SITE_URL: JSON.stringify(
			process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || ''
		),
		VITE_CONVEX_SITE_URL: JSON.stringify(process.env.CONVEX_SITE_URL || ''),
		VITE_SITE_URL: JSON.stringify(
			process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || ''
		),
	},
});
