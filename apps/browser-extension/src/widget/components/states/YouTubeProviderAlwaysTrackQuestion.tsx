import React from 'react';
import type { WidgetState } from '../../../pages/background/providers/types';
import { YouTubeIcon } from '../icons/YouTubeIcon';
import { useWidgetActions } from '../../hooks/useWidgetActions';
import { Button } from '../../../components/ui/button';

interface Props {
	widgetState: WidgetState;
	renderDebugInfo?: () => React.ReactNode;
}

export const YouTubeProviderAlwaysTrackQuestion: React.FC<Props> = ({
	widgetState: _widgetState,
	renderDebugInfo,
}) => {
	const { youtubeQuestionTrackOnce, youtubeQuestionAlwaysTrack } =
		useWidgetActions();

	return (
		<>
			<div>
				<div className="snbex:flex snbex:items-center snbex:gap-2 snbex:mb-2">
					<YouTubeIcon className="snbex:w-6 snbex:h-6 snbex:text-background" />
					<div className="snbex:text-lg snbex:font-bold">Track this video?</div>
				</div>
				<div className="snbex:text-sm snbex:font-medium snbex:text-background snbex:mb-4">
					Do you want to track your time on this video automatically or just
					this time?
				</div>
				<div className="snbex:grid snbex:grid-cols-2 snbex:gap-2">
					<Button
						variant={'neutral'}
						className="snbex:bg-accent snbex:text-white snbex:col-span-1"
						onClick={youtubeQuestionAlwaysTrack}
					>
						Always track
					</Button>
					<Button
						variant={'neutral'}
						className="snbex:col-span-1"
						onClick={youtubeQuestionTrackOnce}
					>
						Just this time
					</Button>
				</div>
			</div>
			{renderDebugInfo?.()}
		</>
	);
};
