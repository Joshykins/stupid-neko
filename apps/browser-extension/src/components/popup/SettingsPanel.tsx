import { ArrowLeft, Settings } from 'lucide-react';
import { IconButton } from '../ui/IconButton';

type SettingsTab = 'integration' | 'widget';

interface SettingsPanelProps {
	showEdit: boolean;
	settingsTab: SettingsTab;
	onToggleEdit: () => void;
	onTabChange: (tab: SettingsTab) => void;
}

export function SettingsPanel({
	showEdit,
	settingsTab,
	onToggleEdit,
	onTabChange,
}: SettingsPanelProps) {
	return (
		<div className="snbex:absolute snbex:left-2 snbex:top-2 snbex:flex snbex:items-center snbex:gap-2">
			{!showEdit ? (
				<IconButton title="Settings" onClick={onToggleEdit} borderless>
					<Settings className="snbex:h-4 snbex:w-4" />
				</IconButton>
			) : (
				<>
					<IconButton title="Back" onClick={onToggleEdit} borderless>
						<ArrowLeft className="snbex:h-4 snbex:w-4" />
					</IconButton>
					<IconButton
						title="Integration Key"
						onClick={() => onTabChange('integration')}
						selected={settingsTab === 'integration'}
					>
						<span className="snbex:text-[11px] snbex:font-semibold">
							Integration Key
						</span>
					</IconButton>
					{/* <IconButton
						title="Widget Settings"
						onClick={() => onTabChange('widget')}
						selected={settingsTab === 'widget'}
					>
						<span className="snbex:text-[11px] snbex:font-semibold">
							Widget
						</span>
					</IconButton> */}
				</>
			)}
		</div>
	);
}
