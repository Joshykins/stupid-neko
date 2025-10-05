import { Switch } from '../ui/switch';
import { useStorage } from '../hooks/useStorage';
import { createLogger } from '../../lib/logger';
const log = createLogger('popup', 'popup:widget-settings');

export function WidgetSettings() {
	const { value: widgetEnabled, setValue: setWidgetEnabled } = useStorage(
		'widgetEnabled',
		true
	);

	const handleToggle = async (enabled: boolean) => {
		try {
			await setWidgetEnabled(enabled);
		} catch (error) {
			log.error('Failed to save widget setting:', error);
		}
	};

	return (
		<div>
			<div className="snbex:mt-3 snbex:flex snbex:items-center snbex:justify-between">
				<div className="snbex:text-sm snbex:font-medium">
					Show widget on supported pages
				</div>
				<Switch
					checked={widgetEnabled}
					onCheckedChange={handleToggle}
					aria-label="Toggle learning widget"
				/>
			</div>
		</div>
	);
}
