import type {
	WidgetState,
	WidgetStateUpdate,
} from "../pages/background/providers/types";
import { onContent } from "../messaging/messagesContentRouter";
import { callBackground } from "../messaging/messagesContentRouter";

export class WidgetStateManager {
	private currentState: WidgetState = { state: "idle" };
	private listeners: Set<(state: WidgetState) => void> = new Set();

	constructor() {
		this.init();
	}

	private init(): void {
		console.log("[WidgetStateManager] Initializing...");
		// Listen for state updates from background script using new messaging pattern
		onContent("WIDGET_STATE_UPDATE", ({ payload }) => {
			console.log("[WidgetStateManager] Received state update:", payload);
			this.updateState(payload);
			return {};
		});
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
		this.listeners.forEach((listener) => {
			try {
				listener(this.currentState);
			} catch (error) {
				console.warn("Widget state listener error:", error);
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
		callBackground("WIDGET_ACTION", { action, payload }).catch((error) => {
			console.error("Failed to send widget action:", error);
		});
	}
}

// Singleton instance
export const widgetStateManager = new WidgetStateManager();
