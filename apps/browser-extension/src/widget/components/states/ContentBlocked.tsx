import React from 'react';
import type { WidgetState } from '../../../pages/background/providers/types';
import { Ban } from 'lucide-react';

interface Props {
	widgetState: WidgetState;
	renderDebugInfo?: () => React.ReactNode;
}

export const ContentBlocked: React.FC<Props> = ({
	widgetState,
	renderDebugInfo,
}) => {
	const title = String(widgetState?.metadata?.title || 'This content');
	return (
		<>
			<div>
				<div className="snbex:flex snbex:items-center snbex:gap-2 snbex:mb-2">
					<Ban className="snbex:w-5 snbex:h-5" />
					<div className="snbex:text-lg snbex:font-bold">Content blocked</div>
				</div>
				<div className="snbex:text-sm snbex:mb-3 snbex:font-medium">
					<span className="snbex:font-bold">{title}</span> is blocked by your
					content policies.
				</div>
				<a
					href="https://www.stupidneko.com/account/content-policies"
					target="_blank"
					rel="noreferrer"
					className="snbex:text-blue-600 snbex:underline"
				>
					Manage content policies
				</a>
			</div>
			{renderDebugInfo?.()}
		</>
	);
};
