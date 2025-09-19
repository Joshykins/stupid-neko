"use client";

import * as React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Button, buttonVariants } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { PlusCircle, Star } from "lucide-react";
import { ManualTrackDialog } from "../ManualTrackDialog";
import { AddFromFavorite } from "../AddFromFavorite";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Form, FormField } from "../ui/form";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { useRouter } from "next/navigation";
import { LanguageCode } from "../../../../../convex/schema";

type FormValues = {
    title: string;
    durationInMinutes: number;
    description?: string;
};

export default function ManuallyTrackRecord() {
    const router = useRouter();
    const [manualOpen, setManualOpen] = React.useState(false);
    const [favoritesOpen, setFavoritesOpen] = React.useState(false);
    const [isSeedOpen, setIsSeedOpen] = React.useState(false);
    const [useCustomMinutes, setUseCustomMinutes] = React.useState(false);
    const addManual = useMutation(api.languageActivityFunctions.addManualLanguageActivity);
    const recentManuallyTrackedLanguageActivities = useQuery(api.languageActivityFunctions.listManualTrackedLanguageActivities, {});
    const recentItems = useQuery(api.languageActivityFunctions.recentManualLanguageActivities, { limit: 8 });
    const me = useQuery(api.meFunctions.me, {});

    const form = useForm<FormValues>({
        defaultValues: {
            title: "",
            durationInMinutes: 10,
            description: "",
        },
    });

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
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    async function onSubmit(values: FormValues) {
        try {
            setIsSubmitting(true);
            await addManual({
                title: values.title,
                description: values.description || undefined,
                durationInMinutes: Number(values.durationInMinutes) || 0,
                language: (me?.languageCode ?? "en") as "ja" | "en",
            });
            form.reset();
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <>
            <Card className="p-4">
                <h1 className="font-display text-4xl md:text-2xl pb-2 leading-tight md:leading-[1.03] tracking-[-0.02em] text-main-foreground">
                    Add a <span className="underline decoration-4 decoration-main italic">manual</span> language activity.
                </h1>
                <p className="text-sm text-muted-foreground pb-6">
                    This is useful for activities that can't be tracked automatically.
                </p>
                <div className="flex gap-3 w-full">
                    <Button
                        onClick={() => { setManualOpen(true); }}
                        size="cta"
                        variant={"default"}
                        className="bg-accent w-full flex-1 bold flex items-center justify-center"
                    >
                        <span className="truncate">Add New</span> <PlusCircle className="!size-6 !stroke-2.5 ml-2 flex-shrink-0" />
                    </Button>
                    <AddFromFavorite>
                        <Button
                            onClick={() => { /* handled by PopoverTrigger */ }}
                            size="cta"
                            variant={"neutral"}
                            className="px-2 bold flex items-center justify-center"
                        >
                            <Star className="!size-6 fill-yellow-300 stroke-border" />
                        </Button>
                    </AddFromFavorite>
                </div>

            </Card >

            <ManualTrackDialog open={manualOpen} onOpenChange={setManualOpen} />

        </>
    );
}


