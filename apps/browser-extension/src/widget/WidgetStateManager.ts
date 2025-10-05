import type {
	WidgetState,
	WidgetStateUpdate,
} from '../pages/background/providers/types';
import { onContent } from '../messaging/messagesContentRouter';
import { callBackground } from '../messaging/messagesContentRouter';
import { createLogger } from '../lib/logger';
const log = createLogger('content', 'widget:state-updates');

export class WidgetStateManager {
	private currentState: WidgetState = { state: 'determining-provider' };
	private listeners: Set<(state: WidgetState) => void> = new Set();

	constructor() {
		this.init();
	}

	private init(): void {
		log.debug('WidgetStateManager initializing...');
		// Listen for state updates from background script using new messaging pattern
		onContent('WIDGET_STATE_UPDATE', ({ payload }) => {
			log.debug('Received widget state update:', payload);
			this.updateState(payload);
			return {};
		});

		// Also try to get initial state from background
		this.requestInitialState();
	}

	private async requestInitialState(): Promise<void> {
		try {
			log.debug('Requesting initial widget state from background...');
			const currentState = await callBackground('GET_WIDGET_STATE', {});
			log.debug('Received initial widget state from background:', currentState);
			if (currentState) {
				this.updateState(currentState);
			}
		} catch (error) {
			log.warn('Failed to get initial widget state:', error);
		}
	}

	/**
	 * Update the widget state
	 */
	updateState(update: WidgetStateUpdate): void {
		this.currentState = {
			...this.currentState,
			...update,
		};

		// Notify all listeners
		this.listeners.forEach(listener => {
			try {
				listener(this.currentState);
			} catch (error) {
				log.warn('Widget state listener error:', error);
			}
		});
	}

	/**
	 * Get the current widget state
	 */
	getCurrentState(): WidgetState {
		return { ...this.currentState };
	}

	/**
	 * Subscribe to state changes
	 */
	subscribe(listener: (state: WidgetState) => void): () => void {
		this.listeners.add(listener);

		// Return unsubscribe function
		return () => {
			this.listeners.delete(listener);
		};
	}

	/**
	 * Send action to background script (e.g., user consent response)
	 */
	sendAction(action: string, payload?: Record<string, unknown>): void {
		callBackground('WIDGET_ACTION', { action, payload }).catch(error => {
			log.error('Failed to send widget action:', error);
		});
	}
}

// Singleton instance
export const widgetStateManager = new WidgetStateManager();
