import { ArrowLeft, Settings } from "lucide-react";
import { IconButton } from "../ui/IconButton";

type SettingsTab = "integration" | "widget";

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
        <div className="absolute left-2 top-2 flex items-center gap-2">
            {!showEdit ? (
                <IconButton
                    title="Settings"
                    onClick={onToggleEdit}
                    borderless
                >
                    <Settings className="h-4 w-4" />
                </IconButton>
            ) : (
                <>
                    <IconButton
                        title="Back"
                        onClick={onToggleEdit}
                        borderless
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                        title="Integration Key"
                        onClick={() => onTabChange("integration")}
                        selected={settingsTab === "integration"}
                    >
                        <span className="text-[11px] font-semibold">
                            Integration Key
                        </span>
                    </IconButton>
                    <IconButton
                        title="Widget Settings"
                        onClick={() => onTabChange("widget")}
                        selected={settingsTab === "widget"}
                    >
                        <span className="text-[11px] font-semibold">Widget</span>
                    </IconButton>
                </>
            )}
        </div>
    );
}
