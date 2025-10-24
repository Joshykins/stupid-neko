'use client';

import { useAuthActions } from '@convex-dev/auth/react';
import { useForm } from '@tanstack/react-form';
import { useQuery } from 'convex/react';
import { ArrowBigLeftDash, Loader2, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../../../../convex/_generated/api';
import { UnreleasedBanner } from '../../../components/marketing/UnreleasedBanner';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

export default function SignInPage() {
	const _router = useRouter();
	const { signIn } = useAuthActions();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [lastUsedProvider, setLastUsedProvider] = useState<string | null>(null);
	// Surface an OAuth account-not-found message if redirected back
	useEffect(() => {
		if (typeof window === 'undefined') return;
		const url = new URL(window.location.href);
		const err = url.searchParams.get('oauthError');
		if (err) {
			url.searchParams.delete('oauthError');
			window.history.replaceState({}, '', url.toString());
			if (err === 'no_account') {
				setErrorMessage(
					'No account exists for this provider. Please create an account first.'
				);
			} else if (err === 'invalid_code') {
				setErrorMessage(
					'Your pre-release code was invalid or already used. Please enter a valid code and try again.'
				);
			}
		}
	}, []);

	// Load last used auth provider from localStorage
	useEffect(() => {
		try {
			if (typeof window !== 'undefined') {
				const saved = window.localStorage.getItem('lastAuthProvider');
				if (saved) setLastUsedProvider(saved);
			}
		} catch {
			// Ignore localStorage errors
		}
	}, []);

	const [preReleaseCode, setPreReleaseCode] = useState('');
	const [debouncedCode, setDebouncedCode] = useState('');
	const [isValidating, setIsValidating] = useState(false);
	useEffect(() => {
		const t = setTimeout(() => setDebouncedCode(preReleaseCode), 1000);
		return () => clearTimeout(t);
	}, [preReleaseCode]);

	const validation = useQuery(api.preReleaseCodeFunctions.validateCode, {
		code: debouncedCode,
	});
	const _derivedFormatted = validation?.formatted ?? preReleaseCode;
	const isDebouncing = debouncedCode !== preReleaseCode;
	const codeIsValid =
		preReleaseCode.trim().length > 0 && validation?.valid === true;

	useEffect(() => {
		if (debouncedCode.trim().length === 0) {
			setIsValidating(false);
			return;
		}
		setIsValidating(true);
	}, [debouncedCode]);

	useEffect(() => {
		if (debouncedCode.trim().length === 0) return;
		if (validation !== undefined) setIsValidating(false);
	}, [validation, debouncedCode]);

	const _form = useForm<{ email: string; password: string }>({
		defaultValues: {
			email: '',
			password: '',
		},
		onSubmit: async () => {
			setErrorMessage(
				'Email/password sign-in is no longer supported. Please use Google or Discord.'
			);
		},
	});

	const _oauthProviders = useMemo(
		() => [
			{ name: 'Discord', strategy: 'oauth_discord' as const },
			{ name: 'Google', strategy: 'oauth_google' as const },
		],
		[]
	);

	return (
		<>
			<div className="flex justify-center absolute top-4 left-0 right-0">
				<UnreleasedBanner />
			</div>
			<div className="h-[95vh]"></div>
			<div className="fixed inset-0 z-40 grid place-items-center px-4">
				<div className="flex flex-col gap-8 items-center">
					<div className="w-full max-w-md rounded-[var(--radius-base)] border-2 border-border bg-secondary-background shadow-shadow text-main-foreground min-w-[460px]">
						<div className="relative p-6 ">
							<div className="absolute left-0 -top-4 -translate-y-[100%] ">
								<Link href="/">
									<Button variant={'default'} size={'sm'}>
										<ArrowBigLeftDash />
										Back
									</Button>
								</Link>
							</div>
							<div className="flex gap-2 flex-col flex-1 items-start">
								<h1 className="text-center font-display text-4xl font-black text-main-foreground text-left">
									Sign in or <br />
									Create your account!
								</h1>
							</div>

							<Image
								src="/cat-on-tree.png"
								alt="Cat reading on a cherry tree"
								width={350}
								height={350}
								className="absolute right-0 top-0 -translate-y-[65%] translate-x-9"
								priority
							/>
						</div>
						<div className="w-full h-0.5 bg-border/70" />
						{errorMessage && (
							<div className="px-4 pb-6 mt-4">
								<div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
									{errorMessage}
								</div>
							</div>
						)}

						<div className="flex flex-col gap-4 px-6 pt-6 pb-6">
							{!validation?.valid && (
								<div className="grid gap-1">
									<Label htmlFor="code" className="font-heading text-sm">
										Pre-release access code
									</Label>
									<div className="relative">
										<Input
											id="code"
											placeholder="XXXX-XXXX-XXXX"
											value={preReleaseCode}
											onChange={e => {
												const raw = e.target.value.toUpperCase();
												const only = raw.replace(/[^A-Z0-9]/g, '');
												const a = only.slice(0, 4);
												const b = only.slice(4, 8);
												const c = only.slice(8, 12);
												const parts = [a, b, c].filter(Boolean);
												setPreReleaseCode(parts.join('-'));
											}}
											onPaste={e => {
												try {
													const text = e.clipboardData
														.getData('text')
														.toUpperCase();
													if (text) {
														e.preventDefault();
														const only = text.replace(/[^A-Z0-9]/g, '');
														const a = only.slice(0, 4);
														const b = only.slice(4, 8);
														const c = only.slice(8, 12);
														const parts = [a, b, c].filter(Boolean);
														const formatted = parts.join('-');
														setPreReleaseCode(formatted);
													}
												} catch {
													// Ignore formatting errors
												}
											}}
											className="uppercase tracking-widest pr-8"
										/>
										{isValidating && (
											<Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
										)}
									</div>
									{!isValidating &&
										!isDebouncing &&
										preReleaseCode &&
										validation &&
										validation.valid === false && (
											<p className="text-sm text-red-500">
												{validation.reason ?? 'Invalid code'}
											</p>
										)}
								</div>
							)}
							{validation?.message && validation.valid && (
								<div className="mt-2">
									<div className="bg-slate-900 border-main !shadow-[4px_4px_0px_0px_var(--main)] p-3 rounded-md ">
										<p className="text-orange-100 text-sm">
											{validation.message}
										</p>
										<p className="text-slate-500 text-xs flex items-center gap-1">
											<span>Your </span>
											<Sparkles className="mt-1 size-3 fill-orange-100" />
											<i>special</i>
											<Sparkles className="size-3 fill-orange-100 mt-1" />
											<span> message from Josh!</span>
										</p>
									</div>
								</div>
							)}
							<Button
								type="button"
								variant="neutral"
								size={'cta'}
								className="relative w-full bg-[#5865F2] text-white"
								disabled={!codeIsValid}
								onClick={async () => {
									try {
										if (!codeIsValid) {
											setErrorMessage('Enter a valid pre-release code');
											return;
										}
										try {
											if (typeof window !== 'undefined') {
												window.localStorage.setItem(
													'preReleaseCode',
													preReleaseCode.trim()
												);
												window.localStorage.setItem(
													'lastAuthProvider',
													'discord'
												);
												setLastUsedProvider('discord');
											}
										} catch {
											// Ignore localStorage errors
										}
										await signIn('discord', { redirectTo: '/get-started' });
									} catch (err: unknown) {
										const error = err as {
											errors?: Array<{ message?: string }>;
										};
										setErrorMessage(
											error?.errors?.[0]?.message || 'OAuth failed'
										);
									}
								}}
							>
								{lastUsedProvider === 'discord' && (
									<Badge variant="dark" className="absolute -top-2 -right-2">
										Last used
									</Badge>
								)}
								<svg
									role="img"
									viewBox="0 0 24 24"
									xmlns="http://www.w3.org/2000/svg"
									className="!h-5.5 !w-5.5 fill-white"
									aria-hidden="true"
								>
									<title>Discord</title>
									<path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
								</svg>
								Discord
							</Button>
							<Button
								type="button"
								variant="neutral"
								size={'cta'}
								className="relative w-full bg-white text-black"
								disabled={!codeIsValid}
								onClick={async () => {
									try {
										if (!codeIsValid) {
											setErrorMessage('Enter a valid pre-release code');
											return;
										}
										try {
											if (typeof window !== 'undefined') {
												window.localStorage.setItem(
													'preReleaseCode',
													preReleaseCode.trim()
												);
												window.localStorage.setItem(
													'lastAuthProvider',
													'google'
												);
												setLastUsedProvider('google');
											}
										} catch {
											// Ignore localStorage errors
										}
										await signIn('google', { redirectTo: '/get-started' });
									} catch (err: unknown) {
										const error = err as {
											errors?: Array<{ message?: string }>;
										};
										setErrorMessage(
											error?.errors?.[0]?.message || 'OAuth failed'
										);
									}
								}}
							>
								{lastUsedProvider === 'google' && (
									<Badge variant="dark" className="absolute -top-2 -right-2">
										Last used
									</Badge>
								)}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									x="0px"
									y="0px"
									width="100"
									height="100"
									viewBox="0 0 48 48"
									className="!h-5.5 !w-5.5"
								>
									<path
										fill="#FFC107"
										d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
									></path>
									<path
										fill="#FF3D00"
										d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
									></path>
									<path
										fill="#4CAF50"
										d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
									></path>
									<path
										fill="#1976D2"
										d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
									></path>
								</svg>
								Google
							</Button>
						</div>

						{/* Email/password form removed: password auth no longer supported */}
					</div>
				</div>
			</div>
		</>
	);
}
