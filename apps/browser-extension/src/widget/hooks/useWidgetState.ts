import { useEffect, useState } from 'react';
import type { WidgetState } from '../../pages/background/providers/types';
import { widgetStateManager } from '../WidgetStateManager';
import { createLogger } from '../../lib/logger';
const log = createLogger('content', 'widget:state-updates');

export function useWidgetState() {
	const [widgetState, setWidgetState] = useState<WidgetState>({
		state: 'determining-provider',
	});

	useEffect(() => {
		log.debug('Initializing widget state manager');

		// Subscribe to state changes
		const unsubscribe = widgetStateManager.subscribe(newState => {
			log.debug('State updated:', newState);
			setWidgetState(newState);
		});

		// Get initial state
		const initialState = widgetStateManager.getCurrentState();
		log.debug('Initial state:', initialState);
		setWidgetState(initialState);

		return unsubscribe;
	}, []);

	return widgetState;
}
