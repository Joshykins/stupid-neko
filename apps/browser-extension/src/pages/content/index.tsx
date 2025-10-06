import React from 'react';
import { createRoot } from 'react-dom/client';
import TrackingWidget from '../../widget/TrackingWidget';
import styles from './content.css?inline';
import { createLogger } from '../../lib/logger';
const log = createLogger('content', 'widget:ui');

import './provider-runtime'; // Initialize provider runtime

// Declare Tailwind CSS browser global
declare global {
	interface Window {
		tailwind?: {
			init: () => void;
		};
	}
}

async function loadFontsUsingFontFace(): Promise<void> {
	try {
		const faces: Array<FontFace> = [];
		const pjNormal = new FontFace(
			'Plus Jakarta Sans',
			`url('${chrome.runtime.getURL('fonts/PlusJakartaSans-VariableFont_wght.ttf')}')`,
			{ style: 'normal', weight: '100 900' }
		);
		faces.push(pjNormal);
		try {
			const pjItalic = new FontFace(
				'Plus Jakarta Sans',
				`url('${chrome.runtime.getURL('fonts/PlusJakartaSans-Italic-VariableFont_wght.ttf')}')`,
				{ style: 'italic', weight: '100 900' }
			);
			faces.push(pjItalic);
		} catch { }
		try {
			const baloo = new FontFace(
				'Baloo 2',
				`url('${chrome.runtime.getURL('fonts/Baloo2-VariableFont_wght.ttf')}')`,
				{ style: 'normal', weight: '400 800' }
			);
			faces.push(baloo);
		} catch { }
		const loads = faces.map(f => f.load());
		const loaded = await Promise.all(loads);
		loaded.forEach(f => {
			document.fonts.add(f);
		});
		// Avoid mutating the host page's <html> to prevent React hydration mismatches
		// Previously: document.documentElement.classList.add('sn-fonts-ready');
	} catch { }
}

function WidgetGate() {
	const [show, setShow] = React.useState<boolean>(true);

	React.useEffect(() => {
		// Check if user has disabled the widget
		const checkWidgetEnabled = async () => {
			try {
				const data = await new Promise<Record<string, unknown>>(resolve => {
					try {
						chrome.storage.sync.get(['widgetEnabled'], items =>
							resolve(items || {})
						);
					} catch {
						resolve({});
					}
				});
				const enabled =
					typeof data?.widgetEnabled === 'boolean' ? data.widgetEnabled : true;
				setShow(enabled);
			} catch {
				setShow(true);
			}
		};

		checkWidgetEnabled();

		// Listen for storage changes
		const handleStorageChange = (
			changes: Record<string, chrome.storage.StorageChange>
		) => {
			if (changes.widgetEnabled) {
				setShow(changes.widgetEnabled.newValue ?? true);
			}
		};

		chrome.storage.onChanged.addListener(handleStorageChange);

		return () => {
			chrome.storage.onChanged.removeListener(handleStorageChange);
		};
	}, []);

	if (!show) return null;

	return (
		<div className="fixed bottom-4 right-4 z-[6000] pointer-events-auto">
			<TrackingWidget />
		</div>
	);
}

// Create Shadow DOM host and inject CSS inside to isolate styles and fonts
const host = document.createElement('div');
host.id = '__stupid-neko-host';
document.body.appendChild(host);
const shadow = host.attachShadow({ mode: 'open' });

// Ensure the host and portal sit above page content
(host as HTMLElement).style.position = 'fixed';
(host as HTMLElement).style.top = '0';
(host as HTMLElement).style.left = '0';
(host as HTMLElement).style.width = '0';
(host as HTMLElement).style.height = '0';
(host as HTMLElement).style.zIndex = '2147483647';

// Shadow root children: style, app root, and portal root for Radix
const appRoot = document.createElement('div');
appRoot.id = '__stupid-neko-root';
const portalRoot = document.createElement('div');
portalRoot.id = '__stupid-neko-portal';
(window as { __stupidNekoPortalEl?: HTMLElement; }).__stupidNekoPortalEl =
	portalRoot;
// Ensure overlays are interactive even if CSS isn't loaded yet
portalRoot.style.pointerEvents = 'auto';
portalRoot.style.position = 'fixed';
portalRoot.style.top = '0';
portalRoot.style.left = '0';
portalRoot.style.zIndex = '2147483647';
shadow.appendChild(appRoot);
shadow.appendChild(portalRoot);
//REM fix
(shadow.host as HTMLElement).style.fontSize = '16px !important';
(host as HTMLElement).style.fontSize = '16px !important';
const root = createRoot(appRoot);

// Create and apply the stylesheet
const sheet = new CSSStyleSheet();
sheet.replaceSync(styles);
shadow.adoptedStyleSheets = [sheet];

// Initialize the app
async function initializeApp() {
	await loadFontsUsingFontFace().catch(() => { });

	// Wait a bit for CSS to load
	await new Promise(resolve => setTimeout(resolve, 100));

	root.render(
		React.createElement(
			'div',
			{
				className: 'h-screen w-screen fixed z-[5000] pointer-events-none',
			},
			React.createElement(WidgetGate)
		)
	);
}

// Start the app
log.info('Content script loaded and initializing...');
initializeApp();
