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
        <div className={cn("snbex:w-full snbex:flex snbex:flex-col snbex:items-center snbex:gap-2 snbex:!px-2 snbex:!py-1", className)}>
            <div className="snbex:flex snbex:items-center snbex:gap-1">
                {auth.me.image && (
                    <img
                        src={auth.me.image}
                        alt={auth.me.name || "User"}
                        className="snbex:h-5 snbex:w-5 snbex:rounded-full snbex:border snbex:border-neutral-300 snbex:object-cover"
                    />
                )}
                <span className="snbex:text-sm snbex:font-medium snbex:pr-2">
                    {(auth.me.name)}
                </span>
            </div>
        </div>
    );
}
