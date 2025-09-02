"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import { useForm } from "@tanstack/react-form";

import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import Image from "next/image";

export default function SignInPage() {
    const router = useRouter();
    const { signIn } = useAuthActions();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    // Surface an OAuth account-not-found message if redirected back
    useEffect(() => {
        if (typeof window === "undefined") return;
        const url = new URL(window.location.href);
        if (url.searchParams.get("oauthError") === "no_account") {
            url.searchParams.delete("oauthError");
            window.history.replaceState({}, "", url.toString());
            setErrorMessage(
                "No account exists for this provider. Please create an account first.",
            );
        }
    }, []);

    const form = useForm<{ email: string; password: string; }>({
        defaultValues: {
            email: "",
            password: "",
        },
        onSubmit: async ({ value }: { value: { email: string; password: string; }; }) => {
            setErrorMessage(null);
            try {
                const form = new FormData();
                form.set("flow", "signIn");
                form.set("email", value.email);
                form.set("password", value.password);
                const { signingIn } = await signIn("password", form);
            } catch (err: any) {
                setErrorMessage(err?.errors?.[0]?.message || "Failed to sign in");
            }
        },
    });

    const oauthProviders = useMemo(
        () => [
            { name: "Discord", strategy: "oauth_discord" as const },
            { name: "Google", strategy: "oauth_google" as const },
        ],
        [],
    );

    return (
        <>
            <div className="h-[95vh]"></div>
            <div className="fixed inset-0 z-40 grid place-items-center px-4">
                <div className="w-full max-w-xl rounded-[var(--radius-base)] border-2 border-border bg-secondary-background shadow-shadow text-main-foreground">
                    <div className="border-b relative border-border p-6  mb-4">
                        <div className="flex gap-2 flex-col flex-1 items-start">
                            <h1 className="text-center font-display text-4xl font-black text-main-foreground text-left">Sign in or <br />Create your account!</h1>
                            <p className="text-center text-sm text-main-foreground/80">Choose a method to continue.</p>
                        </div>

                        <Image
                            src="/cat-on-tree.png"
                            alt="Cat reading on a cherry tree"
                            width={350}
                            height={350}
                            className="absolute right-0 top-0 -translate-y-1/2 translate-x-9"
                            priority
                        />
                    </div>
                    {errorMessage && (
                        <div className="px-4 pt-6 pb-6">
                            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {errorMessage}
                            </div>
                        </div>
                    )}




                    <div className="flex flex-col gap-4 px-6">
                        <Button
                            type="button"
                            variant="neutral"
                            className="w-full bg-[#5865F2] text-white"
                            onClick={async () => {
                                try {
                                    await signIn("discord");
                                } catch (err: any) {
                                    setErrorMessage(err?.errors?.[0]?.message || "OAuth failed");
                                }
                            }}
                        >
                            <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-white" aria-hidden="true"><title>Discord</title><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" /></svg>

                            Discord
                        </Button>
                        <Button
                            type="button"
                            variant="neutral"
                            className="w-full bg-white text-black"
                            onClick={async () => {
                                try {
                                    await signIn("google");
                                } catch (err: any) {
                                    setErrorMessage(err?.errors?.[0]?.message || "OAuth failed");
                                }
                            }}
                        >
                            Google
                        </Button>
                    </div>

                    <div className="my-4 flex items-center gap-4 text-sm text-background">
                        <div className="h-px flex-1 bg-border" />
                        <span>or</span>
                        <div className="h-px flex-1 bg-border" />
                    </div>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.handleSubmit();
                        }}
                        className="space-y-4 px-6 pb-4"
                    >
                        <div className="grid gap-1">
                            <Label htmlFor="email" className="font-heading text-sm">Email address</Label>
                            <form.Field
                                name="email"
                                validators={{
                                    onChange: ({ value }) => (!value.includes("@") ? "Enter a valid email" : undefined),
                                }}
                            >
                                {(field) => (
                                    <>
                                        <Input id="email" type="email" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder="Enter your email" />
                                        {field.state.meta.errors?.[0] && (
                                            <p className="text-sm text-red-500">{String((field.state.meta.errors?.[0] as any)?.message ?? field.state.meta.errors?.[0])}</p>
                                        )}
                                    </>
                                )}
                            </form.Field>
                        </div>

                        <div className="grid gap-1">
                            <Label htmlFor="password" className="font-heading text-sm">Password</Label>
                            <form.Field
                                name="password"
                                validators={{
                                    onChange: ({ value }) => ((value?.length ?? 0) < 8 ? "Use at least 8 characters" : undefined),
                                }}
                            >
                                {(field) => (
                                    <>
                                        <Input id="password" type="password" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder="Enter your password" />
                                        {field.state.meta.errors?.[0] && (
                                            <p className="text-sm text-red-500">{String((field.state.meta.errors?.[0] as any)?.message ?? field.state.meta.errors?.[0])}</p>
                                        )}
                                    </>
                                )}
                            </form.Field>
                        </div>

                        <Button type="submit" className="mt-2 w-full">Continue</Button>

                    </form>


                </div>
            </div>
        </>
    );
}


