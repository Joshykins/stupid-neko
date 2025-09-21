import type { LanguageCode } from "../../../../../convex/schema";
import { languageCodeToLabel } from "../../../../../lib/languages";
import { cn } from "../../lib/utils";
import { useAuth } from "../hooks/useAuth";
import LanguageFlagSVG from "../LanguageFlagSVG";
import { Badge } from "../ui/badge";

export function UserProfile({ className }: { className?: string; }) {
    const auth = useAuth();

    if (!auth.isAuthed || !auth.me) {
        return null;
    }

    const languageLabel = auth.me.languageCode
        ? languageCodeToLabel(auth.me.languageCode)
        : "Language";

    return (
        <div className={cn("w-full flex flex-col items-center gap-2 !px-2 !py-1", className)}>
            <div className="flex items-center gap-1">
                {auth.me.image && (
                    <img
                        src={auth.me.image}
                        alt={auth.me.name || "User"}
                        className="h-5 w-5 rounded-full border border-neutral-300 object-cover"
                    />
                )}
                <span className="text-sm font-medium pr-2">
                    {(auth.me.name)}
                </span>
            </div>
        </div>
    );
}
