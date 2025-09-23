import { motion } from "framer-motion";
import { Settings, Play } from "lucide-react";
import { languageCodeToLabel } from "../../../../../lib/languages";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../ui/button";
import { useState } from "react";
import { callBackground } from "../../messaging/messagesContentRouter";

interface MainViewProps {
    onOpenSettings?: () => void;
}

export function MainView({ onOpenSettings }: MainViewProps) {
    const auth = useAuth();
    const [isStarting, setIsStarting] = useState(false);

    const languageLabel = auth.me?.languageCode
        ? languageCodeToLabel(auth.me.languageCode)
        : "Language";

    const handleStartTracking = async () => {
        setIsStarting(true);
        try {
            const result = await callBackground("START_TRACKING", {});
            if (!result.success) {
                console.error("Failed to start tracking:", result.error);
            }
        } catch (error) {
            console.error("Error starting tracking:", error);
        } finally {
            setIsStarting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="snbex:flex snbex:flex-col snbex:items-start snbex:w-full snbex:px-2"
        >
            <p className="snbex:mt-1 snbex:text-sm snbex:text-gray-600 snbex:text-left">
                {languageLabel} learning companion in your browser.
            </p>
            {!auth.isAuthed && (
                <div className="snbex:mt-4 snbex:w-full snbex:flex snbex:flex-col snbex:items-start snbex:gap-3">
                    <p className="snbex:text-xs snbex:text-gray-500 snbex:text-left">
                        Connect your integration key to start tracking your learning activity.
                    </p>
                    {onOpenSettings && (
                        <Button
                            onClick={onOpenSettings}
                            size="sm"
                            className="snbex:gap-2"
                        >
                            <Settings className="snbex:w-4 snbex:h-4" />
                            Connect Integration Key
                        </Button>
                    )}
                </div>
            )}
            {auth.isAuthed && (
                <div className="snbex:mt-4 snbex:w-full snbex:flex snbex:flex-col snbex:items-start snbex:gap-3">
                    <p className="snbex:text-xs snbex:text-gray-500 snbex:text-left">
                        Start tracking your learning activity on this website.
                    </p>
                    <Button
                        onClick={handleStartTracking}
                        disabled={isStarting}
                        size="sm"
                        className="snbex:gap-2 snbex:bg-green-600 snbex:hover:bg-green-700"
                    >
                        <Play className="snbex:w-4 snbex:h-4" />
                        {isStarting ? "Starting..." : "Start Tracking"}
                    </Button>
                </div>
            )}
        </motion.div>
    );
}
