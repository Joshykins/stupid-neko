import React from 'react';
import type { WidgetState } from '../../../pages/background/providers/types';

interface HiddenStateProps {
	widgetState: WidgetState;
	title: string;
	description?: string;
	iconLeft?: React.ReactNode;
	renderDebugInfo?: () => React.ReactNode;
}

export const HiddenState: React.FC<HiddenStateProps> = ({
	widgetState,
	title,
	description,
	iconLeft,
	renderDebugInfo,
}) => {
	return (
		<>
			<div>
				<div className="snbex:flex snbex:items-center snbex:gap-2 snbex:mb-2">
					{iconLeft}
					<div className="snbex:text-lg snbex:font-bold">{title}</div>
				</div>
				{description && (
					<div className="snbex:text-sm snbex:text-gray-600 snbex:mb-4">
						{description}
					</div>
				)}
				{widgetState.domain && (
					<div className="snbex:text-xs snbex:text-gray-500 snbex:mb-4">
						{widgetState.domain}
					</div>
				)}
			</div>
			{renderDebugInfo?.()}
		</>
	);
};
