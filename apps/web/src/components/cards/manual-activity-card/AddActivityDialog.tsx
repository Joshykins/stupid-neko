'use client';

import { useMutation } from 'convex/react';
import { PlusCircle } from 'lucide-react';
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api } from '../../../../../../convex/_generated/api';
import { Button, buttonVariants } from '../../ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '../../ui/dialog';
import { Form, FormField } from '../../ui/form';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/label';

type FormValues = {
	title: string;
	durationInMs: number;
	description?: string;
	externalUrl?: string;
};

type FavoriteData = {
	title: string;
	description?: string;
	externalUrl?: string;
	defaultDurationInMs: number;
};

type AddActivityDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	autoFillData?: FavoriteData | null;
};

export function AddActivityDialog({
	open,
	onOpenChange,
	autoFillData,
}: AddActivityDialogProps) {
	const addManual = useMutation(
		api.userTargetLanguageActivityFunctions.addManualLanguageActivity
	);

	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const [useCustomMinutes, setUseCustomMinutes] =
		React.useState<boolean>(false);
	const [customHours, setCustomHours] = React.useState<number>(0);
	const [customMinutes, setCustomMinutes] = React.useState<number>(10);

	const form = useForm<FormValues>({
		defaultValues: {
			title: '',
			durationInMs: 10 * 60 * 1000,
			description: '',
			externalUrl: '',
		},
	});

	// Auto-fill form when autoFillData is provided
	React.useEffect(() => {
		if (autoFillData) {
			form.reset({
				title: autoFillData.title,
				durationInMs: autoFillData.defaultDurationInMs,
				description: autoFillData.description || '',
				externalUrl: autoFillData.externalUrl || '',
			});

			// Set custom time fields
			const totalMinutes = Math.max(
				0,
				Math.round((autoFillData.defaultDurationInMs || 0) / 60000)
			);
			setCustomHours(Math.floor(totalMinutes / 60));
			setCustomMinutes(totalMinutes % 60);
			setUseCustomMinutes(false);
		}
	}, [autoFillData, form]);

	// Reset form when dialog closes
	React.useEffect(() => {
		if (!open) {
			form.reset();
			setUseCustomMinutes(false);
			setCustomHours(0);
			setCustomMinutes(10);
		}
	}, [open, form]);

	function _formatMinutesLabel(totalMinutes: number): string {
		const minutes = Math.max(0, Math.round(totalMinutes || 0));
		const hours = Math.floor(minutes / 60);
		const rem = minutes % 60;
		if (hours > 0 && rem > 0) return `${hours}hr ${rem}m`;
		if (hours > 0) return `${hours}hr${hours > 1 ? 's' : ''}`;
		return `${rem}m`;
	}

	const handleSubmit = async () => {
		setIsSubmitting(true);
		await addManual({
			title: form.getValues('title'),
			durationInMs: form.getValues('durationInMs'),
			description: form.getValues('description'),
			externalUrl: form.getValues('externalUrl'),
		});
		setIsSubmitting(false);
		onOpenChange(false);
		toast.success('Activity added successfully!');
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-3xl">
				<DialogHeader>
					<DialogTitle className="flex items-center">
						<PlusCircle className="mr-2 !size-6 !stroke-2.5" /> Track Activity
					</DialogTitle>
					<DialogDescription>
						Log a manual practice session with time and details.
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form className="space-y-4">
						<div className="grid gap-2">
							<Label>Activity Name</Label>
							<FormField
								control={form.control}
								name="title"
								render={({ field }) => <Input {...field} placeholder="Name" />}
							/>
						</div>
						<div className="grid gap-2">
							<Label>Minutes</Label>
							<div className="flex flex-wrap gap-2">
								{[5, 10, 15, 20, 25, 30, 45, 60, 90, 120].map(m => (
									<button
										key={m}
										type="button"
										onClick={() => {
											form.setValue('durationInMs', m * 60 * 1000, {
												shouldDirty: true,
												shouldValidate: true,
											});
											setUseCustomMinutes(false);
										}}
										className={buttonVariants({
											variant:
												Math.round(
													(form.watch('durationInMs') || 0) / 60000
												) === m && !useCustomMinutes
													? 'default'
													: 'neutral',
											size: 'sm',
											className: 'px-3',
										})}
									>
										{m >= 60
											? m % 60 === 0
												? `${m / 60}hr`
												: `${(m / 60).toFixed(1)}hr`
											: `${m}m`}
									</button>
								))}
								<button
									type="button"
									onClick={() => {
										setUseCustomMinutes(true);
										const total = customHours * 60 + customMinutes;
										form.setValue('durationInMs', total * 60 * 1000, {
											shouldDirty: true,
											shouldValidate: true,
										});
									}}
									className={buttonVariants({
										variant: useCustomMinutes ? 'default' : 'neutral',
										size: 'sm',
										className: 'px-3',
									})}
								>
									Custom
								</button>
							</div>
							{useCustomMinutes && (
								<div className="pt-1">
									<div className="inline-flex items-stretch rounded-base border-2 border-border overflow-hidden bg-white">
										<Input
											type="number"
											min={0}
											step={1}
											value={customHours}
											onChange={e => {
												const h = Math.max(
													0,
													Math.min(999, Number(e.target.value) || 0)
												);
												setCustomHours(h);
												const total = h * 60 + customMinutes;
												form.setValue('durationInMs', total * 60 * 1000, {
													shouldDirty: true,
													shouldValidate: true,
												});
											}}
											className="px-2 py-2 text-sm text-main-foreground w-[72px] text-center border-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none shadow-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [appearance:textfield]"
										/>
										<div className="px-0.5 py-2 text-xl text-main-foreground bg-transparent">
											:
										</div>
										<Input
											type="number"
											min={0}
											max={59}
											step={1}
											value={customMinutes}
											onChange={e => {
												const m = Math.max(
													0,
													Math.min(59, Number(e.target.value) || 0)
												);
												setCustomMinutes(m);
												const total = customHours * 60 + m;
												form.setValue('durationInMs', total * 60 * 1000, {
													shouldDirty: true,
													shouldValidate: true,
												});
											}}
											className="px-2 py-2 text-sm text-main-foreground w-[72px] text-center border-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none shadow-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [appearance:textfield]"
										/>
									</div>
								</div>
							)}
						</div>
						<div className="grid gap-2">
							<Label>URL (optional)</Label>
							<FormField
								control={form.control}
								name="externalUrl"
								render={({ field }) => (
									<Input
										{...field}
										placeholder="https://example.com/your-link"
									/>
								)}
							/>
						</div>
						<div className="grid gap-2">
							<Label>Description (optional)</Label>
							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<Textarea
										{...field}
										className="bg-white placeholder:text-main-foreground/70 text-main-foreground"
										placeholder="Optional details"
									/>
								)}
							/>
						</div>
						<div className="mt-2 flex items-center gap-2">
							<Button
								type="button"
								disabled={isSubmitting}
								className="flex-1 bg-accent bold flex items-center justify-center"
								onClick={handleSubmit}
							>
								{isSubmitting ? (
									'Adding…'
								) : (
									<>
										<PlusCircle className="mr-2 !size-5 !stroke-2.5" /> Track
										Activity
									</>
								)}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
