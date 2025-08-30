"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SignInButton, useSignUp } from "@clerk/nextjs";
import { useForm } from "@tanstack/react-form";
import Link from "next/link";

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
    return (
        <label htmlFor={htmlFor} className="block text-sm font-bold text-foreground">
            {children}
        </label>
    );
}

function TextInput({ id, type = "text", value, onChange, placeholder }: { id: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <input
            id={id}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-md border-2 border-black bg-background px-3 py-2 text-foreground shadow-[4px_4px_0_0_#000] focus:outline-none focus:ring-2 focus:ring-primary"
        />
    );
}

export default function GetStartedPage() {
    const router = useRouter();
    const { signUp, isLoaded, setActive } = useSignUp();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(false);

    const form = useForm<{
        username: string;
        email: string;
        password: string;
    }>({
        defaultValues: {
            username: "",
            email: "",
            password: "",
        },
        onSubmit: async ({ value }: { value: { username: string; email: string; password: string } }) => {
            if (!isLoaded) return;
            setErrorMessage(null);
            try {
                await signUp.create({
                    username: value.username || undefined,
                    emailAddress: value.email,
                    password: value.password,
                });
                await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
                setVerifying(true);
            } catch (err: any) {
                setErrorMessage(err?.errors?.[0]?.message || "Failed to sign up");
            }
        },
    });

    const verifyForm = useForm<{ code: string }>({
        defaultValues: { code: "" },
        onSubmit: async ({ value }: { value: { code: string } }) => {
            if (!isLoaded) return;
            setErrorMessage(null);
            try {
                const completeSignUp = await signUp.attemptEmailAddressVerification({ code: value.code });
                if (completeSignUp.status === "complete") {
                    await setActive!({ session: completeSignUp.createdSessionId });
                    router.push("/");
                }
            } catch (err: any) {
                setErrorMessage(err?.errors?.[0]?.message || "Invalid code");
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
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 px-4">
            <div className="w-full max-w-xl rounded-2xl border-2 border-black bg-background p-6 shadow-[16px_16px_0_0_#000]">
                <h1 className="mb-1 text-center font-display text-4xl font-black text-foreground">Create your account</h1>
                <p className="mb-6 text-center text-sm text-muted-foreground">Welcome! Fill in the details to get started.</p>

                {!verifying ? (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.handleSubmit();
                        }}
                        className="space-y-4"
                    >
                        <div className="grid gap-1">
                            <FieldLabel htmlFor="username">Username <span className="text-xs text-muted-foreground">(optional)</span></FieldLabel>
                            <form.Field name="username">
                                {(field) => (
                                    <TextInput id="username" value={field.state.value} onChange={field.handleChange} placeholder="Enter a username" />
                                )}
                            </form.Field>
                        </div>
                        <div className="grid gap-1">
                            <FieldLabel htmlFor="email">Email address</FieldLabel>
                            <form.Field
                                name="email"
                                validators={{
                                    onChange: ({ value }) => (!value.includes("@") ? "Enter a valid email" : undefined),
                                }}
                            >
                                {(field) => (
                                    <>
                                        <TextInput id="email" type="email" value={field.state.value} onChange={field.handleChange} placeholder="Enter your email" />
                                        {field.state.meta.errors?.[0] && (
                                            <p className="text-sm text-destructive">{String((field.state.meta.errors?.[0] as any)?.message ?? field.state.meta.errors?.[0])}</p>
                                        )}
                                    </>
                                )}
                            </form.Field>
                        </div>
                        <div className="grid gap-1">
                            <FieldLabel htmlFor="password">Password</FieldLabel>
                            <form.Field
                                name="password"
                                validators={{
                                    onChange: ({ value }) => ((value?.length ?? 0) < 8 ? "Use at least 8 characters" : undefined),
                                }}
                            >
                                {(field) => (
                                    <>
                                        <TextInput id="password" type="password" value={field.state.value} onChange={field.handleChange} placeholder="Enter your password" />
                                        {field.state.meta.errors?.[0] && (
                                            <p className="text-sm text-destructive">{String((field.state.meta.errors?.[0] as any)?.message ?? field.state.meta.errors?.[0])}</p>
                                        )}
                                    </>
                                )}
                            </form.Field>
                        </div>

                        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

                        <button
                            type="submit"
                            className="mt-2 w-full rounded-md border-2 border-black bg-primary px-4 py-2 font-bold text-primary-foreground shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-transform"
                        >
                            Continue
                        </button>

                        <div className="my-4 flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="h-px flex-1 bg-border" />
                            <span>or</span>
                            <div className="h-px flex-1 bg-border" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!isLoaded) return;
                                    try {
                                        await signUp.authenticateWithRedirect({ strategy: "oauth_discord", redirectUrl: "/sso-callback", redirectUrlComplete: "/" });
                                    } catch (err: any) {
                                        setErrorMessage(err?.errors?.[0]?.message || "OAuth failed");
                                    }
                                }}
                                className="w-full rounded-md border-2 border-black bg-[#5865F2] px-4 py-2 font-bold text-white shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-transform"
                            >
                                Discord
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!isLoaded) return;
                                    try {
                                        await signUp.authenticateWithRedirect({ strategy: "oauth_google", redirectUrl: "/sso-callback", redirectUrlComplete: "/" });
                                    } catch (err: any) {
                                        setErrorMessage(err?.errors?.[0]?.message || "OAuth failed");
                                    }
                                }}
                                className="w-full rounded-md border-2 border-black bg-white px-4 py-2 font-bold text-black shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-transform"
                            >
                                Google
                            </button>
                        </div>

                        <p className="mt-4 text-center text-sm">
                            Already have an account? <SignInButton mode="modal"><span className="underline">Sign in</span></SignInButton>
                        </p>
                    </form>
                ) : (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            verifyForm.handleSubmit();
                        }}
                        className="space-y-4"
                    >
                        <div className="grid gap-1">
                            <FieldLabel htmlFor="code">Enter verification code</FieldLabel>
                            <verifyForm.Field name="code">
                                {(field) => (
                                    <TextInput id="code" value={field.state.value} onChange={field.handleChange} placeholder="123456" />
                                )}
                            </verifyForm.Field>
                        </div>
                        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
                        <button
                            type="submit"
                            className="w-full rounded-md border-2 border-black bg-primary px-4 py-2 font-bold text-primary-foreground shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] transition-transform"
                        >
                            Verify email
                        </button>
                        <p className="text-center text-sm text-muted-foreground">We sent a code to your email.</p>
                    </form>
                )}

                <div className="mt-6 border-t border-dashed border-border pt-3 text-center text-xs text-muted-foreground">
                    Secured by <a className="underline" href="https://clerk.com" target="_blank" rel="noreferrer">Clerk</a>
                </div>
            </div>
        </div>
    );
}


