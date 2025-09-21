import { Switch } from "../ui/switch";
import { useStorage } from "../hooks/useStorage";

export function WidgetSettings() {
    const { value: widgetEnabled, setValue: setWidgetEnabled } = useStorage("widgetEnabled", true);

    const handleToggle = async (enabled: boolean) => {
        try {
            await setWidgetEnabled(enabled);
        } catch (error) {
            console.error("Failed to save widget setting:", error);
        }
    };

    return (
        <div>
            <div className="mt-3 flex items-center justify-between">
                <div className="text-sm font-medium">
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
