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
}

export const WIDGET_STATES: Record<WidgetState['state'], WidgetStateConfig> = {
	'determining-provider': {
		state: 'determining-provider',
		visibility: 'hidden',
		openOnLoad: false,
		forceAlwaysExpanded: false
	},

	'default-provider-idle': {
		state: 'default-provider-idle',
		visibility: 'visible',
		openOnLoad: true,
		forceAlwaysExpanded: false
	},

	'default-provider-awaiting-consent': {
		state: 'default-provider-awaiting-consent',
		visibility: 'visible',
		openOnLoad: true,
		forceAlwaysExpanded: false
	},

	'default-provider-tracking': {
		state: 'default-provider-tracking',
		visibility: 'visible',
		openOnLoad: false,
		forceAlwaysExpanded: false
	},

	'default-provider-prompt-user-for-track': {
		state: 'default-provider-prompt-user-for-track',
		visibility: 'visible',
		openOnLoad: true,
		forceAlwaysExpanded: false
	},

	
	'youtube-tracking-unverified': {
		state: 'youtube-tracking-unverified',
		visibility: 'hidden',
		openOnLoad: false,
		forceAlwaysExpanded: false
	},

	'youtube-not-tracking': {
		state: 'youtube-not-tracking',
		visibility: 'hidden',
		openOnLoad: false,
		forceAlwaysExpanded: false
	},


	'youtube-tracking-verified': {
		state: 'youtube-tracking-verified',
		visibility: 'visible',
		openOnLoad: true,
		forceAlwaysExpanded: true
	},

	'error': {
		state: 'error',
		visibility: 'visible',
		openOnLoad: true,
		forceAlwaysExpanded: false
	}
};

// Single getter function that returns the full config object
export function getWidgetStateConfig(state: WidgetState['state']): WidgetStateConfig {
	return WIDGET_STATES[state] || WIDGET_STATES['error'];
}

