"use client";

import { Authenticated, useMutation, useQuery } from "convex/react";
import dayjs from "dayjs";
import {
	ArrowRightSquare,
	ClockAlert,
	Eye,
	SlidersHorizontal,
	Sprout,
	X,
} from "lucide-react";
import { useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Slider } from "../ui/slider";
// Removed numeric inputs in favor of simple presets

export const TestingComponent = () => {
	const isEnabled = process.env.NEXT_PUBLIC_DANGEROUS_TESTING === "enabled";
	const devDate = useQuery(api.devOnlyFunctions.getDevDate, {});
	const stepDevDate = useMutation(api.devOnlyFunctions.stepDevDate);
	const seedToTarget = useMutation(api.devOnlyFunctions.seedToTargetAtDevDate);
	const reset = useMutation(api.devOnlyFunctions.resetMyDevState);
	const [showSettings, setShowSettings] = useState(false);
	const [open, setOpen] = useState(false);

	const [manualProb, setManualProb] = useState<number>(25);
	const [youtubeProb, setYoutubeProb] = useState<number>(25);
	const [spotifyProb, setSpotifyProb] = useState<number>(25);
	const [ankiProb, setAnkiProb] = useState<number>(25);
	const [targetMinutes, setTargetMinutes] = useState<number>(60);

	const sum = manualProb + youtubeProb + spotifyProb + ankiProb;
	const safeSum = sum > 0 ? sum : 1;
	const pct = (v: number) => Math.round((v / safeSum) * 100);

	if (!isEnabled) return null;

	return (
		<>
			<Authenticated>
				<div className="fixed bottom-4 right-4 z-10">
					<Popover open={open} onOpenChange={setOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="devOnly"
								className="rounded-full h-10 w-10 p-0"
								aria-label="Open testing tools"
							>
								<Eye className="h-5 w-5" />
							</Button>
						</PopoverTrigger>
						<PopoverContent
							side="top"
							align="end"
							className="w-[min(92vw,28rem)] p-0 bg-transparent border-none shadow-none"
						>
							<div className="flex flex-col gap-3">
								{showSettings && (
									<Card className="w-full px-3 py-3 rounded-xl shadow-xl">
										<div className="flex items-center justify-between mb-1">
											<p className="text-xs font-bold">Probabilities</p>
											<Button
												aria-label="Close settings"
												size="sm"
												variant="neutral"
												className="rounded-full"
												onClick={() => setShowSettings(false)}
											>
												<X className="h-4 w-4" />
											</Button>
										</div>
										<p className="text-[10px] text-muted-foreground mb-2">
											Weights auto-normalize. Tune sources below.
										</p>
										<div className="flex flex-col gap-3">
											<div className="flex flex-col gap-1">
												<p className="text-xs font-medium">
													Manual Probability ({pct(manualProb)}%)
												</p>
												<Slider
													mainColor="var(--color-source-misc)"
													value={[manualProb]}
													onValueChange={(v) => setManualProb(v[0] ?? 0)}
												/>
											</div>
											<div className="flex flex-col gap-1">
												<p className="text-xs font-medium">
													Youtube Probability ({pct(youtubeProb)}%)
												</p>
												<Slider
													mainColor="var(--color-source-youtube)"
													value={[youtubeProb]}
													onValueChange={(v) => setYoutubeProb(v[0] ?? 0)}
												/>
											</div>
											<div className="flex flex-col gap-1">
												<p className="text-xs font-medium">
													Spotify Probability ({pct(spotifyProb)}%)
												</p>
												<Slider
													mainColor="var(--color-source-spotify)"
													value={[spotifyProb]}
													onValueChange={(v) => setSpotifyProb(v[0] ?? 0)}
												/>
											</div>
											<div className="flex flex-col gap-1">
												<p className="text-xs font-medium">
													Anki Probability ({pct(ankiProb)}%)
												</p>
												<Slider
													mainColor="var(--color-source-anki)"
													value={[ankiProb]}
													onValueChange={(v) => setAnkiProb(v[0] ?? 0)}
												/>
											</div>
											<div className="flex flex-col gap-2 pt-2">
												<div className="text-xs font-bold">
													Target Minutes: {targetMinutes}m
												</div>
												<Slider
													value={[targetMinutes]}
													min={10}
													max={480}
													step={5}
													onValueChange={(v) => setTargetMinutes(v[0] ?? 60)}
												/>
											</div>
										</div>
									</Card>
								)}
								<Card className="flex flex-col gap-4 p-3 rounded-xl shadow-xl w-full">
									<div className="flex w-full items-center justify-between gap-2">
										<div className="flex items-center gap-2">
											<Button
												variant={"destructive"}
												className="bg-red-400 rounded-full"
												title="Danger: Reset local dev state"
												onClick={async () => {
													const ok = window.confirm(
														"This will delete all tracking data, experience, streaks, and reset the day to today. Proceed?",
													);
													if (!ok) return;
													await reset({});
												}}
											>
												<ClockAlert />
											</Button>
											<div className="px-3 py-1 rounded-md text-black bg-white/70 shadow-sm">
												<p className="text-sm font-medium whitespace-nowrap">
													{(devDate && dayjs(devDate).format("MMM DD, YYYY")) ||
														"No-Date"}
												</p>
											</div>
										</div>
										<div className="flex items-center gap-2">
											<Button
												variant={"neutral"}
												size="sm"
												aria-label="Toggle probabilities"
												onClick={() => setShowSettings((s) => !s)}
											>
												<SlidersHorizontal className="h-4 w-4" />
											</Button>
										</div>
									</div>

									<div className="flex w-full items-center gap-3">
										<Button
											variant={"neutral"}
											onClick={async () => {
												await stepDevDate({ days: 1 });
											}}
										>
											Advance Day <ArrowRightSquare className="ml-1" />
										</Button>
										<div className="flex-1" />
										<Button
											variant={"devOnly"}
											className="gap-1"
											onClick={async () => {
												await seedToTarget({
													targetMinutes,
													minChunk: 10,
													maxChunk: 45,
													manualOnly: false,
													probManual: manualProb,
													probYoutube: youtubeProb,
													probSpotify: spotifyProb,
													probAnki: ankiProb,
												});
											}}
										>
											Seed Day <Sprout className="h-4 w-4" />
										</Button>
									</div>
								</Card>
							</div>
						</PopoverContent>
					</Popover>
				</div>
			</Authenticated>
		</>
	);
};
