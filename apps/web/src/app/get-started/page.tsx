"use client";
import * as React from "react";
import { Stepper, StepDef, StepRenderProps } from "../../components/get-started/Stepper";
import { Button } from "../../components/ui/button";
import LanguageFlagSVG from "../../components/LanguageFlagSVG";
import { Progress } from "../../components/ui/progress";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useAuthActions } from "@convex-dev/auth/react";
import { ArrowLeft, Youtube, Tv, Linkedin, Instagram, Users, Search, Newspaper, Music2, HelpCircle, Smile, Briefcase, Clock, GraduationCap, Plane } from "lucide-react";
import { COMMON_LANGUAGES } from "../../lib/languages";
import { ScrollArea } from "../../components/ui/scroll-area";
import { LanguageCode } from "../../../../../convex/schema";
import Image from "next/image";
import { api } from "../../../../../convex/_generated/api";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";

type State = {
    language?: LanguageCode;
    heardFrom?: string;
    reason?: string;
    level?: string;
    username?: string;
    email?: string;
    password?: string;
};

const howHeard = ["News/article/blog", "YouTube", "TV/streaming", "LinkedIn", "Facebook/Instagram", "TikTok", "Friends/family", "Google Search", "Other"] as const;
const reasons = ["Connect with people", "Just for fun", "Boost my career", "Spend time productively", "Support my education", "Prepare for travel", "Other"] as const;
const levels = [
    "I’m new to the language",
    "I know some common words",
    "I can have basic conversations",
    "I can talk about various topics",
    "I can discuss most topics in detail",
] as const;

// Has title, progress bar, and back button
const GettingStartedHeader = ({ back, step, totalSteps }: { back: () => void; step: number; totalSteps: number; }) => {
    const progress = (step / totalSteps) * 100;
    return (
        <Card className="p-0">
            <div className="flex gap-4 p-2 items-center">
                <Button onClick={back}><ArrowLeft className="stroke-3" /> </Button>
                <Progress value={progress} />
            </div>
        </Card>
    );
};

const GettingStartedFooter = ({ next, disabled }: { next: () => void; disabled: boolean; }) => {
    return (
        <div className="flex justify-end p-4">
            <Button onClick={next} disabled={disabled}>Continue</Button>
        </div>
    );
};


function LanguageStep({ state, setState, next }: StepRenderProps<State>) {
    const languages = COMMON_LANGUAGES;


    return (
        <>
            <div className="mx-auto p-4">
                <div className="flex flex-col gap-6">
                    {languages.map((l) => (
                        <Button className="justify-start flex items-center gap-4 py-8" size={"cta"} key={l.code} variant={state.language === l.code ? "default" : "neutral"} disabled={!l.supported} onClick={() => setState((s: State) => ({ ...s, language: l.code }))}>
                            <LanguageFlagSVG language={l.code} className="!size-16" />
                            <div className="font-semibold text-2xl">{l.label}</div>
                        </Button>
                    ))}
                </div>
            </div>
        </>
    );
}

function HeardStep({ state, setState }: StepRenderProps<State>) {
    const adorn = (label: string) => {
        const base = "inline-flex items-center justify-center size-7 rounded-md";
        const map: Record<string, { node: React.ReactNode; className: string; }> = {
            "News/article/blog": { node: <Newspaper className="size-4" />, className: "text-amber-700 bg-amber-100" },
            "YouTube": { node: <Youtube className="size-4" />, className: "text-red-700 bg-red-100" },
            "TV/streaming": { node: <Tv className="size-4" />, className: "text-indigo-700 bg-indigo-100" },
            "LinkedIn": { node: <Linkedin className="size-4" />, className: "text-blue-700 bg-blue-100" },
            "Facebook/Instagram": { node: <Instagram className="size-4" />, className: "text-pink-700 bg-pink-100" },
            "TikTok": { node: <Music2 className="size-4" />, className: "text-fuchsia-700 bg-fuchsia-100" },
            "Friends/family": { node: <Users className="size-4" />, className: "text-emerald-700 bg-emerald-100" },
            "Google Search": { node: <Search className="size-4" />, className: "text-green-700 bg-green-100" },
            "Other": { node: <HelpCircle className="size-4" />, className: "text-slate-700 bg-slate-100" },
        };
        const entry = map[label] ?? map["Other"];
        return <span className={`${base} ${entry.className}`}>{entry.node}</span>;
    };
    return (
        <div className="mx-auto w-full max-w-3xl py-8 md:py-12">
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 px-3`}>
                {howHeard.map((o) => (
                    <Button key={o} variant={state.heardFrom === o ? "default" : "neutral"} className="h-auto p-4 justify-start text-left flex items-center gap-3 " onClick={() => setState((s: State) => ({ ...s, heardFrom: o }))}>
                        {adorn(o)}
                        <div className="text-lg font-medium">{o}</div>
                    </Button>
                ))}
            </div>
        </div>
    );
}

function ReasonStep({ state, setState }: StepRenderProps<State>) {
    const adorn = (label: string) => {
        const base = "inline-flex items-center justify-center size-7 rounded-md";
        const map: Record<string, { node: React.ReactNode; className: string; }> = {
            "Connect with people": { node: <Users className="size-4" />, className: "text-emerald-700 bg-emerald-100" },
            "Just for fun": { node: <Smile className="size-4" />, className: "text-yellow-700 bg-yellow-100" },
            "Boost my career": { node: <Briefcase className="size-4" />, className: "text-blue-700 bg-blue-100" },
            "Spend time productively": { node: <Clock className="size-4" />, className: "text-violet-700 bg-violet-100" },
            "Support my education": { node: <GraduationCap className="size-4" />, className: "text-indigo-700 bg-indigo-100" },
            "Prepare for travel": { node: <Plane className="size-4" />, className: "text-orange-700 bg-orange-100" },
            "Other": { node: <HelpCircle className="size-4" />, className: "text-slate-700 bg-slate-100" },
        };
        const entry = map[label] ?? map["Other"];
        return <span className={`${base} ${entry.className}`}>{entry.node}</span>;
    };
    return (
        <div className="mx-auto w-full max-w-3xl py-8 md:py-12">
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 px-3`}>
                {reasons.map((o) => (
                    <Button key={o} variant={state.reason === o ? "default" : "neutral"} className="h-auto p-4 justify-start text-left flex items-center gap-3 " onClick={() => setState((s: State) => ({ ...s, reason: o }))}>
                        {adorn(o)}
                        <div className="text-lg font-medium">{o}</div>
                    </Button>
                ))}
            </div>
        </div>
    );
}

function LevelStep({ state, setState }: StepRenderProps<State>) {
    const WifiBars = ({ filled }: { filled: number; }) => {
        const bars = [0, 1, 2, 3];
        return (
            <span className="inline-flex items-end gap-0.5 bg-foreground/80 rounded-md p-1">
                {bars.map((b) => (
                    <span key={b} className={`w-1.5 rounded-sm ${b === 0 ? "h-1.5" : b === 1 ? "h-2.5" : b === 2 ? "h-3.5" : "h-4.5"} ${b < filled ? "bg-accent" : "bg-border/30"}`} />
                ))}
            </span>
        );
    };
    return (
        <div className="mx-auto w-full max-w-3xl py-8 md:py-12">
            <div className={`grid grid-cols-1 gap-3 px-3`}>
                {levels.map((o, idx) => (
                    <Button key={o} variant={state.level === o ? "default" : "neutral"} className="h-auto p-4 justify-start text-left flex items-center gap-3 " onClick={() => setState((s: State) => ({ ...s, level: o }))}>
                        <span className="inline-flex items-center justify-center size-7 rounded-md bg-transparent">
                            <WifiBars filled={Math.max(0, Math.min(4, idx))} />
                        </span>
                        <div className="text-lg font-medium">{o}</div>
                    </Button>
                ))}
            </div>
        </div>
    );
}

function OurMethodStep({ back, state }: any) {
    return null;
}

export default function GetStartedPage() {
    const steps: Array<StepDef<State>> = [
        { id: "language", title: "I want learn...", subtitle: "Pick the language you want to have automatically tracked.", render: (p) => <LanguageStep {...p} /> },
        { id: "heard", title: "How did you hear about us?", subtitle: "Tell us where you found Stupid Neko.", render: (p) => <HeardStep {...p} /> },
        { id: "reason", title: "Why are you learning?", subtitle: "Help us tailor your experience to your goals.", render: (p) => <ReasonStep {...p} /> },
        { id: "level", title: "What is your current level?", subtitle: "Tell us your current proficiency to help us better your experience.", render: (p) => <LevelStep {...p} /> }
    ];

    const completeOnboarding = useMutation(api.myFunctions.completeOnboarding);
    const router = useRouter();



    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [controls, setControls] = React.useState<{ next: () => void; back: () => void; goTo: (i: number) => void; } | null>(null);
    const handleStepChange = React.useCallback((i: number) => setCurrentIndex(i), []);
    const handleControlsChange = React.useCallback((c: { next: () => void; back: () => void; goTo: (i: number) => void; }) => setControls(c), []);
    const [currentState, setCurrentState] = React.useState<State>({});
    const handleStateChange = React.useCallback((s: State) => {
        setCurrentState(s);
        try {
            const payload = {
                language: s.language,
                heardFrom: s.heardFrom,
                reason: s.reason,
                level: s.level,
            };
            if (typeof window !== "undefined") {
                window.localStorage.setItem("onboardingState", JSON.stringify(payload));
            }
        } catch {
            // ignore
        }
    }, []);
    const currentStep = steps[currentIndex];
    const stepIsComplete = React.useMemo(() => {
        switch (currentStep?.id) {
            case "language":
                return Boolean(currentState.language);
            case "heard":
                return Boolean(currentState.heardFrom);
            case "reason":
                return Boolean(currentState.reason);
            case "level":
                return Boolean(currentState.level);
            case "create-account": {
                const email = currentState.email ?? "";
                const password = currentState.password ?? "";
                const ok = /.+@.+\..+/.test(email) && password.length >= 8;
                return ok;
            }
            default:
                return true;
        }
    }, [currentStep?.id, currentState]);
    const selectedLanguageLabel = React.useMemo(() => {
        const found = COMMON_LANGUAGES.find((l) => l.code === currentState.language);
        return found?.label ?? "language";
    }, [currentState.language]);
    const computedTitle = currentStep?.id === "level"
        ? (<>
            What is your current <span className="font-semibold">{selectedLanguageLabel}</span> level?
        </>)
        : currentStep?.title;

    const handleComplete = React.useCallback(async () => {
        if (!currentState.language) return;
        try {
            await completeOnboarding({
                targetLanguageCode: currentState.language,
                qualifierFormHeardAboutUsFrom: currentState.heardFrom ?? undefined,
                qualifierFormLearningReason: currentState.reason ?? undefined,
                qualifierFormCurrentLevel: currentState.level ?? undefined,
            });
            router.replace("/dashboard");
        } catch (e) {
            // no-op
        }
    }, [completeOnboarding, currentState.language, currentState.heardFrom, currentState.reason, currentState.level, router]);

    React.useEffect(() => {
        const isLast = currentStep?.id === "level";
        if (isLast && stepIsComplete) {
            // Auto-complete when last step validated and user clicks Continue
            // We intercept the next() call by running completion on next tick
        }
    }, [currentStep?.id, stepIsComplete]);

    return (
        <main className="h-screen flex items-center">
            <div className="h-[85vh] flex flex-col mx-auto max-w-4xl gap-4">
                <GettingStartedHeader back={() => controls?.back?.()} step={currentIndex + 1} totalSteps={steps.length} />

                <Card className="p-0 flex flex-col h-full flex-1">
                    <div className="flex relative">
                        <div className="flex flex-col items-start"></div>
                        <div className="flex-1">
                            <h2 className="text-2xl px-4 pt-4 pb-2 font-semibold">{computedTitle ?? "Title goes here"}</h2>
                            <p className="text-sm text-muted-foreground pb-4 px-4">{currentStep?.subtitle ?? "Subtitle goes here"}</p>
                        </div>
                        <Image
                            src="/cat-on-tree.png"
                            alt="Cat reading on a cherry tree"
                            width={350}
                            height={350}
                            className="absolute right-0 top-0 -translate-y-1/2 translate-x-8"
                            priority
                        />
                    </div>

                    <div className="w-full h-[1px] bg-border" />
                    <ScrollArea className="flex-1">
                        <div className="h-[50vh] w-2xl">
                            <Stepper<State>
                                steps={steps}
                                initialState={{}}
                                onStepChange={handleStepChange}
                                onControlsChange={handleControlsChange}
                                onStateChange={handleStateChange}
                            />
                        </div>
                    </ScrollArea>
                    <div className="w-full h-[1px] bg-border" />
                    <GettingStartedFooter
                        next={() => {
                            const isLast = currentStep?.id === "level";
                            if (isLast && stepIsComplete) {
                                void handleComplete();
                            } else {
                                controls?.next?.();
                            }
                        }}
                        disabled={!stepIsComplete}
                    />
                </Card>
            </div>
        </main>
    );
}


