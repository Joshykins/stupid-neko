import { useMutation } from "convex/react";
import { PlusCircle, Star } from "lucide-react";
import React from "react";
import { Form, useForm } from "react-hook-form";
import { Label } from "recharts";
import { toast } from "sonner";
import { api } from "../../../../../../convex/_generated/api";
import { Button, buttonVariants } from "../../ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "../../ui/dialog";
import { FormField } from "../../ui/form";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";

type FormValues = {
	title: string;
	durationInMinutes: number;
	description?: string;
	externalUrl?: string;
};

export function AddManualActivityButton() {
	const createFavorite = useMutation(
		api.userTargetLanguageFavoriteActivityFunctions.createFavorite,
	);
	const addManual = useMutation(
		api.userTargetLanguageActivityFunctions.addManualLanguageActivity,
	);

	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const [isCreatingFavorite, setIsCreatingFavorite] = React.useState(false);
	const [confirmCreateOpen, setConfirmCreateOpen] = React.useState(false);
	const [confirmTrackOpen, setConfirmTrackOpen] = React.useState(false);

	const [useCustomMinutes, setUseCustomMinutes] =
		React.useState<boolean>(false);
	const [customHours, setCustomHours] = React.useState<number>(0);
	const [customMinutes, setCustomMinutes] = React.useState<number>(10);

	const form = useForm<FormValues>({
		defaultValues: {
			title: "",
			durationInMinutes: 10,
			description: "",
			externalUrl: "",
		},
	});

	function formatMinutesLabel(totalMinutes: number): string {
		const minutes = Math.max(0, Math.round(totalMinutes || 0));
		const hours = Math.floor(minutes / 60);
		const rem = minutes % 60;
		if (hours > 0 && rem > 0) return `${hours}hr ${rem}m`;
		if (hours > 0) return `${hours}hr${hours > 1 ? "s" : ""}`;
		return `${rem}m`;
	}

	return (
		<>
			<Dialog>
				<DialogTrigger asChild>
					<Button
						size="cta"
						variant={"default"}
						className="bg-accent w-full flex-1 bold flex items-center justify-center"
					>
						<span className="truncate">Add New</span>{" "}
						<PlusCircle className="!size-6 !stroke-2.5 ml-2 flex-shrink-0" />
					</Button>
				</DialogTrigger>
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
									render={({ field }) => (
										<Input {...field} placeholder="Name" />
									)}
								/>
							</div>
							<div className="grid gap-2">
								<Label>Minutes</Label>
								<div className="flex flex-wrap gap-2">
									{[5, 10, 15, 20, 25, 30, 45, 60, 90, 120].map((m) => (
										<button
											key={m}
											type="button"
											onClick={() => {
												form.setValue("durationInMinutes", m, {
													shouldDirty: true,
													shouldValidate: true,
												});
												setUseCustomMinutes(false);
											}}
											className={buttonVariants({
												variant:
													form.watch("durationInMinutes") === m &&
													!useCustomMinutes
														? "default"
														: "neutral",
												size: "sm",
												className: "px-3",
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
											form.setValue("durationInMinutes", total, {
												shouldDirty: true,
												shouldValidate: true,
											});
										}}
										className={buttonVariants({
											variant: useCustomMinutes ? "default" : "neutral",
											size: "sm",
											className: "px-3",
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
												onChange={(e) => {
													const h = Math.max(
														0,
														Math.min(999, Number(e.target.value) || 0),
													);
													setCustomHours(h);
													const total = h * 60 + customMinutes;
													form.setValue("durationInMinutes", total, {
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
												onChange={(e) => {
													const m = Math.max(
														0,
														Math.min(59, Number(e.target.value) || 0),
													);
													setCustomMinutes(m);
													const total = customHours * 60 + m;
													form.setValue("durationInMinutes", total, {
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
									disabled={isCreatingFavorite}
									variant="neutral"
									onClick={() => {
										const values = form.getValues();
										const title = (values.title ?? "").trim();
										if (!title) {
											form.setError("title", {
												type: "manual",
												message: "Please enter a name first.",
											});
											(form as any).setFocus?.("title");
											return;
										}
										setConfirmCreateOpen(true);
									}}
								>
									{isCreatingFavorite ? (
										"Creating…"
									) : (
										<>
											<Star className="mr-2 !size-5" /> Create Favorite
										</>
									)}
								</Button>
								<Button
									type="button"
									disabled={isSubmitting}
									className="flex-1 bg-accent bold flex items-center justify-center"
									onClick={() => setConfirmTrackOpen(true)}
								>
									{isSubmitting ? (
										"Adding…"
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

					{/* Confirm Create Favorite */}
					<Dialog open={confirmCreateOpen} onOpenChange={setConfirmCreateOpen}>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Create this favorite?</DialogTitle>
							</DialogHeader>
							<div className="text-sm text-main-foreground">
								{(form.getValues().title ?? "").trim() || "(untitled)"} —{" "}
								{Math.max(0, Number(form.getValues().durationInMinutes) || 0)}{" "}
								minutes
							</div>
							<DialogFooter>
								<Button
									variant="neutral"
									onClick={() => setConfirmCreateOpen(false)}
								>
									Cancel
								</Button>
								<Button
									onClick={async () => {
										const values = form.getValues();
										const title = (values.title ?? "").trim();
										if (!title) {
											form.setError("title", {
												type: "manual",
												message: "Please enter a name first.",
											});
											(form as any).setFocus?.("title");
											return;
										}
										try {
											setIsCreatingFavorite(true);
											await createFavorite({
												title,
												description: values.description || undefined,
												externalUrl: values.externalUrl || undefined,
												defaultDurationInMinutes:
													Number(values.durationInMinutes) || 0,
											} as any);
											toast.success("Favorite created");
											setConfirmCreateOpen(false);
											form.reset();
											setUseCustomMinutes(false);
											setCustomHours(0);
											setCustomMinutes(10);
										} finally {
											setIsCreatingFavorite(false);
										}
									}}
								>
									Create
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>

					{/* Confirm Track */}
					<Dialog open={confirmTrackOpen} onOpenChange={setConfirmTrackOpen}>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Add this record?</DialogTitle>
							</DialogHeader>
							<div className="text-sm text-main-foreground">
								{(form.getValues().title ?? "").trim() || "(untitled)"} —{" "}
								{formatMinutesLabel(
									Number(form.getValues().durationInMinutes) || 0,
								)}
							</div>
							<DialogFooter>
								<Button
									variant="neutral"
									onClick={() => setConfirmTrackOpen(false)}
								>
									Cancel
								</Button>
								<Button
									onClick={async () => {
										try {
											setIsSubmitting(true);
											const values = form.getValues();
											await addManual({
												title: ((values.title ?? "").trim() ||
													undefined) as any,
												description: values.description || undefined,
												durationInMinutes:
													Number(values.durationInMinutes) || 0,
												externalUrl: values.externalUrl || undefined,
											});
											toast.success("Activity tracked");
											setConfirmTrackOpen(false);
											form.reset();
											setUseCustomMinutes(false);
											setCustomHours(0);
											setCustomMinutes(10);
										} finally {
											setIsSubmitting(false);
										}
									}}
								>
									Add Record
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</DialogContent>
			</Dialog>
		</>
	);
}
