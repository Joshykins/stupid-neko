import { LanguageCode } from "../../../../convex/schema";

export const LanguageName = ({ language }: { language: LanguageCode; }) => {
    switch (language) {
        case "ja":
            return "Japanese";
        case "en":
            return "English";
        default: return "Unknown Language";
    }
};