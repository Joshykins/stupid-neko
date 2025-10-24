import React from 'react';
import { Button } from '../../../components/ui/button';
import type { WidgetState } from '../../../pages/background/providers/types';
import { useWidgetActions } from '../../hooks/useWidgetActions';
import { Globe2 } from 'lucide-react';
import { languageCodeToLabel } from '../../../../../../lib/languages';
import { useUserInfo } from '../../hooks/useUserInfo';

interface Props {
	widgetState: WidgetState;
	renderDebugInfo?: () => React.ReactNode;
}

export const WebsiteProviderIdleDetected: React.FC<Props> = ({
	widgetState,
	renderDebugInfo,
}) => {
	const { defaultDontTrack, defaultOpenAlwaysTrackQuestion } =
		useWidgetActions();
	const userInfo = useUserInfo();
	const domain = widgetState.domain || 'this site';
	return (
		<>
			<div>
				<div className="snbex:flex snbex:items-center snbex:gap-2 snbex:mb-2">
					<Globe2 className="snbex:w-6 snbex:h-6" />

					<div className="snbex:flex snbex:flex-col snbex:items-start snbex:text-lg snbex:font-bold">
						{/* LANGUAGE NAME */}
						<span>{languageCodeToLabel(userInfo.languageCode)} detected!</span>
						<span className="snbex:text-sm snbex:font-medium snbex:text-background snbex:mb-2">
							Want to track your time on this site?
						</span>
					</div>
				</div>

				{widgetState.metadata?.title && (
					<div className="snbex:text-sm snbex:mb-2 snbex:truncate snbex:max-w-[260px]">
						{String(widgetState.metadata.title)}
					</div>
				)}
				<div className="snbex:text-xs snbex:text-gray-500 snbex:mb-3">
					{domain}
				</div>
				<div className="snbex:flex snbex:gap-2">
					<Button
						variant="neutral"
						className="snbex:flex-1"
						onClick={defaultDontTrack}
					>
						Dont Track
					</Button>
					<Button
						className="snbex:flex-1 snbex:bg-accent"
						variant={'neutral'}
						onClick={defaultOpenAlwaysTrackQuestion}
					>
						Track This!
					</Button>
				</div>
			</div>
			{renderDebugInfo?.()}
		</>
	);
};
