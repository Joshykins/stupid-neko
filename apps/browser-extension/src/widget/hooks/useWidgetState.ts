import { useEffect, useState } from "react";
import type { WidgetState } from "../../pages/background/providers/types";
import { widgetStateManager } from "../WidgetStateManager";

export function useWidgetState() {
	const [widgetState, setWidgetState] = useState<WidgetState>({
		state: "idle",
	});

	useEffect(() => {
		console.log("[useWidgetState] Initializing widget state manager");

		// Subscribe to state changes
		const unsubscribe = widgetStateManager.subscribe((newState) => {
			console.log("[useWidgetState] State updated:", newState);
			setWidgetState(newState);
		});

		// Get initial state
		const initialState = widgetStateManager.getCurrentState();
		console.log("[useWidgetState] Initial state:", initialState);
		setWidgetState(initialState);

		return unsubscribe;
	}, []);

	return widgetState;
}
