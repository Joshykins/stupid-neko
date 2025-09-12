"use client";

import * as React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Button, buttonVariants } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { PlusCircle, Trees } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Form, FormField } from "../ui/form";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { LanguageCode } from "../../../../../convex/schema";

type FormValues = {
    title: string;
    durationInMinutes: number;
    description?: string;
    contentCategories: Array<"audio" | "video" | "text" | "other">;
    skillCategories: Array<"listening" | "reading" | "speaking" | "writing">;
};

export default function ManuallyTrackRecord() {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isSeedOpen, setIsSeedOpen] = React.useState(false);
    const [useCustomMinutes, setUseCustomMinutes] = React.useState(false);
    const addManual = useMutation(api.languageActivityFunctions.addManualLanguageActivity);
    const deleteAll = useMutation(api.languageActivityFunctions.deleteAllMyLanguageActivities);
    const seedRecords = useMutation(api.languageActivityFunctions.seedMyLanguageActivities);
    const recentManuallyTrackedLanguageActivities = useQuery(api.languageActivityFunctions.listManualTrackedLanguageActivities, {});
    const recentItems = useQuery(api.languageActivityFunctions.recentManualLanguageActivities, { limit: 8 });
    const me = useQuery(api.meFunctions.me, {});

    const form = useForm<FormValues>({
        defaultValues: {
            title: "",
            durationInMinutes: 10,
            description: "",
            contentCategories: [],
            skillCategories: ["listening"],
        },
    });

    const isDev = process.env.NODE_ENV === "development";
    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toLocalInput = (d: Date) => {
        const pad = (n: number) => String(n).padStart(2, "0");
        const yyyy = d.getFullYear();
        const mm = pad(d.getMonth() + 1);
        const dd = pad(d.getDate());
        const hh = pad(d.getHours());
        const min = pad(d.getMinutes());
        return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    };
    const [seedStart, setSeedStart] = React.useState<string>(toLocalInput(thirtyDaysAgo));
    const [seedEnd, setSeedEnd] = React.useState<string>(toLocalInput(now));
    const [seedNum, setSeedNum] = React.useState<number>(50);
    const [seedMinMinutes, setSeedMinMinutes] = React.useState<number>(5);
    const [seedMaxMinutes, setSeedMaxMinutes] = React.useState<number>(60);
    const [seedLanguage, setSeedLanguage] = React.useState<LanguageCode | undefined>(undefined);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isSeeding, setIsSeeding] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    async function onSubmit(values: FormValues) {
        try {
            setIsSubmitting(true);
            await addManual({
                title: values.title,
                description: values.description || undefined,
                durationInMinutes: Number(values.durationInMinutes) || 0,
                contentCategories: values.contentCategories,
                skillCategories: values.skillCategories,
                language: (me?.languageCode ?? "en") as "ja" | "en",
            });
            form.reset();
            setIsOpen(false);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <h1 className="font-display text-4xl md:text-2xl pb-2 leading-tight md:leading-[1.03] tracking-[-0.02em] text-main-foreground">
                        Add a <span className="underline decoration-4 decoration-main italic">manual</span> record for a task that can't be tracked automatically.
                    </h1>
                    <p className="text-muted-foreground tracking-tight font-base">
                        This is useful for tracking tasks that are not part of your daily routine, or tasks that you want to track manually.
                    </p>
                </CardHeader>
                <div className="my-4 h-px w-full border-t border-border" />
                <CardContent>
                    <div className="flex items-center gap-2">
                        <Button onClick={() => setIsOpen(true)} size="cta" variant={"default"} className="bg-accent grow bold flex items-center">Add Record <PlusCircle className="!size-6 !stroke-2.5" /></Button>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={() => setIsSeedOpen(true)}
                                        size="icon"
                                        variant={"devOnly" as any}
                                        data-dev-hidden={process.env.NODE_ENV !== "development"}
                                        aria-label="Seed Records"
                                    >
                                        <Trees className="!size-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Seed Records</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    {recentItems && recentItems.length > 0 && (
                        <div className="mt-4">
                            <div className="flex gap-2 items-center">

                                <div className="my-4 h-px w-full translate-y-0.5 border-t border-border border-dashed" />
                                <span>or</span>
                                <div className="my-4 h-px w-full  translate-y-0.5 border-t border-border border-dashed" />
                            </div>
                            <div className="text-sm text-main-foreground/80 mb-2">Add based on recently tracked manual records:</div>
                            <div className="flex flex-wrap gap-2">
                                {recentItems.map((it, idx) => (
                                    <button
                                        key={`${it.title ?? "item"}-${idx}`}
                                        type="button"
                                        onClick={() => {
                                            form.reset({
                                                title: it.title ?? "",
                                                durationInMinutes: Math.max(0, Math.round((it.durationInSeconds ?? 0) / 60)),
                                                description: it.description ?? "",
                                                contentCategories: (it.contentCategories as any) ?? [],
                                                skillCategories: (it.skillCategories as any) ?? [],
                                            });
                                            setUseCustomMinutes(false);
                                            setIsOpen(true);
                                        }}
                                        className={buttonVariants({ variant: "neutral", size: "sm", className: "px-3" })}
                                    >
                                        {(it.title ?? "Untitled")}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add a manual record</DialogTitle>
                    </DialogHeader>
                    <DialogDescription>
                        Add a manual record for a task that can't be tracked automatically.
                    </DialogDescription>
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-3"
                        >
                            <div className="grid gap-2">
                                <Label>Task</Label>
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <Input {...field} placeholder="Enter the task" />
                                    )}
                                />
                                {recentManuallyTrackedLanguageActivities && recentManuallyTrackedLanguageActivities.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {recentManuallyTrackedLanguageActivities.map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => form.setValue("title", t, { shouldDirty: true, shouldValidate: true })}
                                                className={buttonVariants({ variant: form.watch("title") === t ? "default" : "neutral", size: "sm", className: "px-3" })}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label>Content categories</Label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { label: "Audio", value: "audio" },
                                        { label: "Video", value: "video" },
                                        { label: "Text", value: "text" },
                                        { label: "Other", value: "other" },
                                    ].map(({ label, value }) => {
                                        const selected = form.watch("contentCategories").includes(value as any);
                                        return (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => {
                                                    const current = form.getValues("contentCategories");
                                                    let next = current;
                                                    if (value === "other") {
                                                        next = selected ? [] : ["other"];
                                                    } else {
                                                        next = selected
                                                            ? current.filter((v) => v !== value)
                                                            : [...current.filter((v) => v !== "other"), value as any];
                                                    }
                                                    form.setValue("contentCategories", next as any, { shouldDirty: true, shouldValidate: true });
                                                }}
                                                className={buttonVariants({
                                                    variant: selected ? "default" : "neutral",
                                                    size: "sm",
                                                    className: "px-3",
                                                })}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Skill categories</Label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { label: "Listening", value: "listening" },
                                        { label: "Reading", value: "reading" },
                                        { label: "Speaking", value: "speaking" },
                                        { label: "Writing", value: "writing" },
                                    ].map(({ label, value }) => {
                                        const selected = form.watch("skillCategories").includes(value as any);
                                        return (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => {
                                                    const current = form.getValues("skillCategories");
                                                    const next = selected
                                                        ? current.filter((v) => v !== value)
                                                        : [...current, value as any];
                                                    form.setValue("skillCategories", next as any, { shouldDirty: true, shouldValidate: true });
                                                }}
                                                className={buttonVariants({
                                                    variant: selected ? "default" : "neutral",
                                                    size: "sm",
                                                    className: "px-3",
                                                })}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Minutes</Label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { label: "5m", value: 5 },
                                        { label: "10m", value: 10 },
                                        { label: "15m", value: 15 },
                                        { label: "20m", value: 20 },
                                        { label: "25m", value: 25 },
                                        { label: "30m", value: 30 },
                                        { label: "45m", value: 45 },
                                        { label: "1hr", value: 60 },
                                        { label: "1hr30m", value: 90 },
                                        { label: "2hr", value: 120 },
                                        { label: "3hr", value: 180 },
                                        { label: "4hr", value: 240 },
                                    ].map(({ label, value }) => (
                                        <button
                                            key={label}
                                            type="button"
                                            onClick={() => {
                                                form.setValue("durationInMinutes", value, { shouldDirty: true, shouldValidate: true });
                                                setUseCustomMinutes(false);
                                            }}
                                            className={buttonVariants({
                                                variant: form.watch("durationInMinutes") === value && !useCustomMinutes ? "default" : "neutral",
                                                size: "sm",
                                                className: "px-3",
                                            })}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setUseCustomMinutes(true)}
                                        className={buttonVariants({
                                            variant: useCustomMinutes ? "default" : "neutral",
                                            size: "sm",
                                            className: "px-3",
                                        })}
                                    >
                                        Other
                                    </button>
                                </div>
                                {useCustomMinutes && (
                                    <FormField
                                        control={form.control}
                                        name="durationInMinutes"
                                        render={({ field }) => (
                                            <Input
                                                type="number"
                                                min={0}
                                                step={1}
                                                {...field}
                                                onChange={(e) => field.onChange(Number(e.target.value))}
                                                placeholder="Enter minutes"
                                            />
                                        )}
                                    />
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label>Description (optional)</Label>
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <Textarea {...field} className="bg-white placeholder:text-main-foreground/70 text-main-foreground" placeholder="Optional details" />
                                    )}
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
                                    {isSubmitting ? "Adding..." : "Add Record"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

        </>
    );
}


