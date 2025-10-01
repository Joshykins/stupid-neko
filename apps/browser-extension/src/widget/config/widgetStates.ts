// Centralized widget state configuration
// This file defines all widget states and their behaviors in one location

import type { WidgetState } from '../../pages/background/providers/types';

export interface WidgetStateConfig {
	state: WidgetState['state'];
	visibility: 'visible' | 'hidden';
	expandable: boolean;
	showTimer: boolean;
	showControls: boolean;
	requiresUserInteraction: boolean;
}

export const WIDGET_STATES: Record<WidgetState['state'], WidgetStateConfig> = {
	'determining-provider': {
		state: 'determining-provider',
		visibility: 'hidden',
		expandable: false,
		showTimer: false,
		showControls: false,
		requiresUserInteraction: false
	},

	'default-provider-idle': {
		state: 'default-provider-idle',
		visibility: 'visible',
		expandable: true,
		showTimer: false,
		showControls: true,
		requiresUserInteraction: true
	},

	'default-provider-awaiting-consent': {
		state: 'default-provider-awaiting-consent',
		visibility: 'visible',
		expandable: true,
		showTimer: false,
		showControls: true,
		requiresUserInteraction: true
	},

	'default-provider-tracking': {
		state: 'default-provider-tracking',
		visibility: 'visible',
		expandable: true,
		showTimer: true,
		showControls: true,
		requiresUserInteraction: false
	},

	'default-provider-prompt-user-for-track': {
		state: 'default-provider-prompt-user-for-track',
		visibility: 'visible',
		expandable: true,
		showTimer: false,
		showControls: true,
		requiresUserInteraction: true
	},

	'youtube-idle': {
		state: 'youtube-idle',
		visibility: 'hidden',
		expandable: false,
		showTimer: false,
		showControls: false,
		requiresUserInteraction: false
	},

	'youtube-tracking': {
		state: 'youtube-tracking',
		visibility: 'visible',
		expandable: true,
		showTimer: true,
		showControls: true,
		requiresUserInteraction: false
	},

	'error': {
		state: 'error',
		visibility: 'visible',
		expandable: true,
		showTimer: false,
		showControls: true,
		requiresUserInteraction: true
	}
};

// Single getter function that returns the full config object
export function getWidgetStateConfig(state: WidgetState['state']): WidgetStateConfig {
	return WIDGET_STATES[state] || WIDGET_STATES['error'];
}

