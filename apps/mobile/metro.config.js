// Learn more https://docs.expo.dev/guides/monorepos/#expo-router
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
// Force Metro 0.81+ plugin availability for SDK 53
try {
	require.resolve("metro/src/ModuleGraph/worker/importLocationsPlugin");
} catch {
	// Metro plugin importLocationsPlugin not found. Ensure metro@0.81+ is installed via expo install --fix.
}

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

/** @type {import('metro-config').ConfigT} */
const config = getDefaultConfig(projectRoot);

// 1) Watch all files in the monorepo so Metro rebuilds when packages change
config.watchFolders = [workspaceRoot];

// 2) Resolve modules from both the app and the workspace root node_modules
config.resolver = config.resolver || {};
config.resolver.nodeModulesPaths = [
	path.resolve(projectRoot, "node_modules"),
	path.resolve(workspaceRoot, "node_modules"),
];

// 2a) Ensure a single React instance (avoid pulling React 19 from workspace)
config.resolver.extraNodeModules = {
	react: path.resolve(projectRoot, "node_modules/react"),
	"react-native": path.resolve(projectRoot, "node_modules/react-native"),
};
// Make resolution deterministic to these paths only
config.resolver.disableHierarchicalLookup = true;

// 3) Enable symlinked package resolution (pnpm/yarn workspaces)
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
