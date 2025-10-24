import React from 'react';
import { Button } from '../../../components/ui/button';
import type { WidgetState } from '../../../pages/background/providers/types';
import { useWidgetActions } from '../../hooks/useWidgetActions';
import { Globe2 } from 'lucide-react';

interface Props {
	widgetState: WidgetState;
	renderDebugInfo?: () => React.ReactNode;
}

export const WebsiteProviderNotTracking: React.FC<Props> = ({
	widgetState,
	renderDebugInfo,
}) => {
	const { defaultTrackAnyway } = useWidgetActions();
	const domain = widgetState.domain || 'this site';

	return (
		<>
			<div>
				<div className="snbex:flex snbex:items-center snbex:gap-2 snbex:mb-2">
					<Globe2 className="snbex:w-6 snbex:h-6" />
					<div className="snbex:text-lg snbex:font-bold">Not tracking</div>
				</div>
				{widgetState.metadata?.title && (
					<div className="snbex:text-xs snbex:text-muted-foreground snbex:mb-2 snbex:truncate snbex:max-w-[260px]">
						{String(widgetState.metadata.title)}
					</div>
				)}
				<div className="snbex:text-sm snbex:font-medium snbex:text-background snbex:mb-4">
					Not tracking your time on{' '}
					<span className="snbex:font-bold">{domain}</span>
				</div>
				<Button
					className="snbex:w-full snbex:mt-3 snbex:bg-foreground snbex:text-background"
					onClick={defaultTrackAnyway}
				>
					Track anyway
				</Button>
			</div>
			{renderDebugInfo?.()}
		</>
	);
};
