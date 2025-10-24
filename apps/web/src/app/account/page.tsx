'use client';

import { useAuthActions } from '@convex-dev/auth/react';
import { useForm } from '@tanstack/react-form';
import {
	Authenticated,
	Unauthenticated,
	useMutation,
	useQuery,
} from 'convex/react';
import Link from 'next/link';
import { useState } from 'react';
import { api } from '../../../../../convex/_generated/api';
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from '../../components/ui/avatar';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import IntegrationsCard from './components/IntegrationsCard';

export default function AccountPage() {
	const { signOut: _signOut } = useAuthActions();
	const me = useQuery(api.userFunctions.me);
	const updateMe = useMutation(api.userFunctions.updateMe);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	return (
		<div className="py-10">
			<Unauthenticated>
				<Card className="mx-auto max-w-xl p-6 text-center">
					<h1 className="mb-2 font-display text-3xl font-black text-main-foreground">
						My account
					</h1>
					<p className="mb-4 text-main-foreground/80">
						You need to be signed in to view your account.
					</p>
					<div className="flex justify-center gap-3">
						<Button asChild variant="neutral">
							<Link href="/sign-in">Sign in</Link>
						</Button>
						<Button asChild variant="default">
							<Link href="/create-account">Create account</Link>
						</Button>
					</div>
				</Card>
			</Unauthenticated>

			<Authenticated>
				<div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-3">
					<Card className="p-6 md:col-span-1 flex flex-col items-center gap-4">
						<Avatar className="size-24">
							<AvatarImage
								src={me?.image ?? undefined}
								alt={me?.name ?? 'User'}
							/>
							<AvatarFallback>{(me?.name ?? 'U').slice(0, 1)}</AvatarFallback>
						</Avatar>
						<div className="text-center">
							<div className="text-xl font-heading">
								{me?.name ?? 'Your Account'}
							</div>
						</div>
					</Card>

					<Card className="p-6 md:col-span-2">
						<h2 className=" font-heading text-xl">Profile details</h2>

						<div className="my-4 h-px w-full bg-border" />

						<EditForm
							initialName={me?.name ?? ''}
							initialTimezone={me?.timezone ?? ''}
							onSave={async values => {
								setErrorMessage(null);
								setSuccessMessage(null);
								setSaving(true);
								try {
									await updateMe({ name: values.name || undefined });
									setSuccessMessage('Profile updated');
								} catch {
									setErrorMessage('Failed to update profile');
								} finally {
									setSaving(false);
								}
							}}
							saving={saving}
							errorMessage={errorMessage}
							successMessage={successMessage}
						/>
					</Card>

					<div className="md:col-span-3">
						<IntegrationsCard />
					</div>
				</div>
			</Authenticated>
		</div>
	);
}

function EditForm({
	initialName,
	initialTimezone,
	onSave,
	saving,
	errorMessage,
	successMessage,
}: {
	initialName: string;
	initialTimezone: string;
	onSave: (values: { name: string; timezone: string; }) => Promise<void>;
	saving: boolean;
	errorMessage: string | null;
	successMessage: string | null;
}) {
	const form = useForm<{ name: string; timezone: string; }>({
		defaultValues: {
			name: initialName,
			timezone: initialTimezone,
		},
		onSubmit: async ({
			value,
		}: {
			value: { name: string; timezone: string; };
		}) => {
			await onSave(value);
		},
	});

	return (
		<form
			onSubmit={e => {
				e.preventDefault();
				form.handleSubmit();
			}}
			className="space-y-4"
		>
			{/* Only name is editable by design */}
			<div className="grid gap-1">
				<Label htmlFor="name" className="font-heading text-sm">
					Username
				</Label>
				<form.Field
					name="name"
					validators={{
						onChange: ({ value }) =>
							value && value.length < 3
								? 'Use at least 3 characters'
								: undefined,
					}}
				>
					{field => (
						<>
							<Input
								id="name"
								value={field.state.value}
								onChange={e => field.handleChange(e.target.value)}
								placeholder="Choose a username"
							/>
							{field.state.meta.errors?.[0] && (
								<p className="text-sm text-red-500">
									{String(
										(field.state.meta.errors?.[0] as { message?: string; })?.message ??
										field.state.meta.errors?.[0]
									)}
								</p>
							)}
						</>
					)}
				</form.Field>
			</div>

			{errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
			{successMessage && (
				<p className="text-sm text-green-600">{successMessage}</p>
			)}

			<Button type="submit" disabled={saving} className="mt-1">
				{saving ? 'Saving...' : 'Save changes'}
			</Button>
		</form>
	);
}

// BlacklistManager moved to account/blacklisted page
