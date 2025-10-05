// Centralized widget state configuration
// This file defines all widget states and their behaviors in one location

import type { WidgetState } from '../../pages/background/providers/types';

export interface WidgetStateConfig {
	state: WidgetState['state'];
	visibility: 'visible' | 'hidden';
	// Expands the widget(if not already) if its visible
	openOnLoad: boolean;
	// Should force the widget to be expanded is no longer closable.
	forceAlwaysExpanded: boolean;
	// Whether the widget is tracking content.
	isTracking: boolean;
}

export const WIDGET_STATES: Record<WidgetState['state'], WidgetStateConfig> = {
	'determining-provider': {
		state: 'determining-provider',
		visibility: 'hidden',
		openOnLoad: false,
		forceAlwaysExpanded: false,
		isTracking: false
	},

	'default-provider-idle': {
		state: 'default-provider-idle',
		visibility: 'visible',
		openOnLoad: false,
		forceAlwaysExpanded: false,
		isTracking: false
	},

	// New default provider states
	'default-provider-idle-detected': {
		state: 'default-provider-idle-detected',
		visibility: 'visible',
		openOnLoad: true,
		forceAlwaysExpanded: false,
		isTracking: false,
	},

	'default-provider-always-track-question': {
		state: 'default-provider-always-track-question',
		visibility: 'visible',
		openOnLoad: true,
		forceAlwaysExpanded: false,
		isTracking: false,
	},

	'default-provider-tracking': {
		state: 'default-provider-tracking',
		visibility: 'visible',
		openOnLoad: true,
		forceAlwaysExpanded: false,
		isTracking: true
	},

	'default-provider-tracking-stopped': {
		state: 'default-provider-tracking-stopped',
		visibility: 'visible',
		openOnLoad: true,
		forceAlwaysExpanded: false,
		isTracking: false,
	},

	'default-provider-not-tracking': {
		state: 'default-provider-not-tracking',
		visibility: 'visible',
		openOnLoad: true,
		forceAlwaysExpanded: false,
		isTracking: false,
	},

	
	'youtube-tracking-unverified': {
		state: 'youtube-tracking-unverified',
		visibility: 'hidden',
		openOnLoad: false,
		forceAlwaysExpanded: false,
		isTracking: false
	},

	'youtube-not-tracking': {
		state: 'youtube-not-tracking',
		visibility: 'hidden',
		openOnLoad: false,
		forceAlwaysExpanded: false,
		isTracking: false
	},


	'youtube-tracking-verified': {
		state: 'youtube-tracking-verified',
		visibility: 'visible',
		openOnLoad: true,
		forceAlwaysExpanded: false,
		isTracking: true
	},

	// New: YouTube provider stopped state
	'youtube-provider-tracking-stopped': {
		state: 'youtube-provider-tracking-stopped',
		visibility: 'visible',
		openOnLoad: true,
		forceAlwaysExpanded: false,
		isTracking: false,
	},

	// New: Content blocked by policy
	'content-blocked': {
		state: 'content-blocked',
		visibility: 'visible',
		openOnLoad: true,
		forceAlwaysExpanded: false,
		isTracking: false,
	},

	'error': {
		state: 'error',
		visibility: 'visible',
		openOnLoad: true,
		forceAlwaysExpanded: false,
		isTracking: false
	}
};

// Single getter function that returns the full config object
export function getWidgetStateConfig(state: WidgetState['state']): WidgetStateConfig {
	return WIDGET_STATES[state] || WIDGET_STATES['error'];
}

