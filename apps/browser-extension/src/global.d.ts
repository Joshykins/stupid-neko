declare module "*.svg" {
	import React = require("react");
	export const ReactComponent: React.SFC<React.SVGProps<SVGSVGElement>>;
	const src: string;
	export default src;
}

declare module "*.json" {
	const content: string;
	export default content;
}

declare const CONVEX_SITE_URL: string;
declare const SITE_URL: string;
declare const VITE_CONVEX_SITE_URL: string;
declare const VITE_SITE_URL: string;
