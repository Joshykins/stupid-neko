import { LanguageCode } from "../../../../convex/schema";

export type AppLanguage = {
    code: LanguageCode;
    label: string;
    supported: boolean;
};

export const COMMON_LANGUAGES: Array<AppLanguage> = [
    { code: "ja", label: "Japanese", supported: true },
    { code: "en", label: "English", supported: true },
    { code: "es", label: "Spanish", supported: false },
    { code: "fr", label: "French", supported: false },
    { code: "de", label: "German", supported: false },
    { code: "ko", label: "Korean", supported: false },
    { code: "it", label: "Italian", supported: false },
    { code: "zh", label: "Chinese", supported: false },
    { code: "hi", label: "Hindi", supported: false },
    { code: "ru", label: "Russian", supported: false },
    { code: "ar", label: "Arabic", supported: false },
    { code: "pt", label: "Portuguese", supported: false },
    { code: "tr", label: "Turkish", supported: false },
];
