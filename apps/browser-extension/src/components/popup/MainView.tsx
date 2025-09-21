import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import { languageCodeToLabel } from "../../../../../lib/languages";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../ui/button";

interface MainViewProps {
    onOpenSettings?: () => void;
}

export function MainView({ onOpenSettings }: MainViewProps) {
    const auth = useAuth();

    const languageLabel = auth.me?.languageCode
        ? languageCodeToLabel(auth.me.languageCode)
        : "Language";

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="flex flex-col items-start w-full px-2"
        >
            <p className="mt-1 text-sm text-gray-600 text-left">
                {languageLabel} learning companion in your browser.
            </p>
            {!auth.isAuthed && (
                <div className="mt-4 w-full flex flex-col items-start gap-3">
                    <p className="text-xs text-gray-500 text-left">
                        Connect your integration key to start tracking your learning activity.
                    </p>
                    {onOpenSettings && (
                        <Button
                            onClick={onOpenSettings}
                            size="sm"
                            className="gap-2"
                        >
                            <Settings className="w-4 h-4" />
                            Connect Integration Key
                        </Button>
                    )}
                </div>
            )}
        </motion.div>
    );
}
