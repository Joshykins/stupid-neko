import type React from 'react';
import { callBackground } from '../../messaging/messagesContentRouter';

export const IdleState: React.FC = () => {
	const handleTestClick = async () => {
		console.log('[IdleState] Test button clicked');
		try {
			await callBackground('WIDGET_ACTION', {
				action: 'test',
				payload: { test: true },
			});
		} catch (error) {
			console.error('Failed to test widget:', error);
		}
	};

	return (
		<div className="flex items-center justify-center p-4">
			<div className="text-center">
				<div className="w-8 h-8 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center">
					<div className="w-4 h-4 rounded-full bg-gray-300"></div>
				</div>
				<p className="text-sm text-gray-600 mb-2">Ready to track content</p>
				<button
					type="button"
					onClick={handleTestClick}
					className="text-xs text-blue-600 hover:text-blue-800 underline"
				>
					Test Widget
				</button>
			</div>
		</div>
	);
};
