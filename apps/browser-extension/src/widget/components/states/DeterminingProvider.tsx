import React from 'react';
import type { WidgetState } from '../../../pages/background/providers/types';
import { HiddenState } from './HiddenState';

interface DeterminingProviderProps {
	widgetState: WidgetState;
	renderDebugInfo?: () => React.ReactNode;
}

export const DeterminingProvider: React.FC<DeterminingProviderProps> = ({
	widgetState,
	renderDebugInfo,
}) => {
	return (
		<HiddenState
			widgetState={widgetState}
			title="Determining Provider"
			description="Analyzing content to determine the best tracking method"
			renderDebugInfo={renderDebugInfo}
		/>
	);
};
