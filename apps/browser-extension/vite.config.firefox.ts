import { crx, type ManifestV3Export } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import { defineConfig, mergeConfig } from 'vite';
import baseConfig, { baseBuildOptions, baseManifest } from './vite.config.base';

const outDir = resolve(__dirname, 'dist_firefox');

export default mergeConfig(
	baseConfig,
	defineConfig({
		plugins: [
			crx({
				manifest: {
					...baseManifest,
					background: {
						scripts: ['src/pages/background/index.ts'],
					},
				} as ManifestV3Export,
				browser: 'firefox',
				contentScripts: {
					injectCss: true,
				},
			}),
		],
		build: {
			...baseBuildOptions,
			outDir,
		},
		publicDir: resolve(__dirname, 'public'),
	})
);
