'use client';

import * as React from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../../../convex/_generated/api';
import Image from 'next/image';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { Copy, ExternalLink } from 'lucide-react';

export default function IntegrationForBrowserExtension() {
	const integrationKey = useQuery(
		api.integrationKeyFunctions.getIntegrationKey
	);
	const regenerateIntegrationKey = useMutation(
		api.integrationKeyFunctions.regenerateIntegrationKey
	);
	const clearIntegrationKey = useMutation(
		api.integrationKeyFunctions.clearIntegrationKey
	);

	const isConnected = !!(
		integrationKey?.integrationId && integrationKey?.integrationKeyUsedByPlugin
	);

	const [guideOpen, setGuideOpen] = React.useState(false);
	const [manageOpen, setManageOpen] = React.useState(false);
	const [confirmOpen, setConfirmOpen] = React.useState(false);
	const [copied, setCopied] = React.useState(false);

	return (
		<div className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border/50 hover:border-border transition-colors">
			<div className="flex items-center gap-3">
				<div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/50">
					<Image
						src="/brands/browser-extension.svg"
						alt="Browser Extension"
						width={20}
						height={20}
						className="w-8 h-8"
					/>
				</div>
				<div>
					<Label className="font-medium">Browser Extension</Label>
					<div className="text-xs text-muted-foreground">
						{isConnected
							? 'Connected and tracking web activity'
							: 'Track web activity automatically.'}
					</div>
				</div>
			</div>
			<Switch
				style={
					{
						'--switch-checked-bg': 'var(--color-source-misc)',
					} as React.CSSProperties
				}
				checked={isConnected}
				onCheckedChange={v => {
					if (v) setGuideOpen(true);
					else if (isConnected) setManageOpen(true);
					else setConfirmOpen(true);
				}}
			/>

			{/* Enable Guide */}
			<Dialog
				open={guideOpen}
				onOpenChange={o => {
					setGuideOpen(o);
				}}
			>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Install Browser Extension</DialogTitle>
						<DialogDescription>
							Follow these steps to connect your browser extension and start
							tracking web activity.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-6">
						<div className="space-y-3">
							<h3 className="font-semibold text-sm">
								Step 1: Install the Extension
							</h3>
							<div className="p-4 rounded-lg bg-muted/50 border">
								<p className="text-sm text-muted-foreground mb-3">
									Download and install the browser extension from your
									browser&apos;s extension store.
								</p>
								<Button
									variant="neutral"
									size="sm"
									onClick={() =>
										window.open('https://chrome.google.com/webstore', '_blank')
									}
									className="gap-2"
								>
									<ExternalLink className="w-4 h-4" />
									Open Chrome Web Store
								</Button>
							</div>
						</div>

						<div className="space-y-3">
							<h3 className="font-semibold text-sm">
								Step 2: Copy Your Integration Key
							</h3>
							<div className="p-4 rounded-lg bg-muted/50 border">
								<p className="text-sm text-muted-foreground mb-3">
									Copy this key and paste it into the browser extension when
									prompted.
								</p>
								<div className="mt-3 flex items-center gap-2">
									<div className="relative w-full">
										<Input
											readOnly
											value={
												integrationKey?.integrationId ?? 'Not generated yet'
											}
											className="pr-10"
											onClick={e => {
												const input = e.currentTarget as HTMLInputElement;
												input.select();
											}}
										/>
										<button
											type="button"
											className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-base p-1 text-main-foreground/80 hover:text-main-foreground hover:bg-border/30 cursor-pointer transition-colors duration-150 disabled:opacity-50"
											onClick={async () => {
												const key = integrationKey?.integrationId;
												if (!key) return;
												try {
													await navigator.clipboard.writeText(key);
													setCopied(true);
													setTimeout(() => setCopied(false), 1500);
												} catch {
													// ignore errors
												}
											}}
											disabled={!integrationKey?.integrationId}
											aria-label="Copy integration key"
											title="Copy"
										>
											<Copy className="size-4" />
										</button>
										{copied && (
											<div className="absolute right-2 -top-7 rounded-base bg-secondary-background border-2 border-border px-2 py-1 text-xs text-main-foreground shadow-sm">
												Copied
											</div>
										)}
									</div>
									<Button
										type="button"
										onClick={async () => {
											try {
												await regenerateIntegrationKey({});
											} catch {
												// ignore errors
											}
										}}
									>
										{integrationKey?.integrationId ? 'Regenerate' : 'Generate'}
									</Button>
								</div>
							</div>
						</div>

						<div className="space-y-3">
							<h3 className="font-semibold text-sm">
								Step 3: Connect in Extension
							</h3>
							<div className="p-4 rounded-lg bg-muted/50 border">
								<p className="text-sm text-muted-foreground">
									Open the extension popup and paste your integration key to
									establish the connection. The toggle will automatically enable
									once connected.
								</p>
							</div>
						</div>
					</div>

					<DialogFooter>
						<Button variant="neutral" onClick={() => setGuideOpen(false)}>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Manage / Disconnect */}
			<Dialog
				open={manageOpen}
				onOpenChange={o => {
					setManageOpen(o);
				}}
			>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Manage Browser Extension</DialogTitle>
						<DialogDescription>
							Connected and tracking web activity
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-3">
						<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border-2">
							<div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
							<span className="text-xs p-0 font-medium text-background">
								Connected and tracking web activity
							</span>
						</div>
					</div>

					<div className="space-y-6">
						<div className="space-y-3">
							<h3 className="font-semibold text-sm">Integration Key</h3>
							<div className="p-4 rounded-lg bg-muted/50 border">
								<p className="text-sm text-muted-foreground mb-3">
									This is your unique integration key that connects your browser
									extension to your account.
								</p>
								<div className="relative w-full">
									<Input
										readOnly
										value={integrationKey?.integrationId ?? 'Not available'}
										className="pr-10"
										onClick={e => {
											const input = e.currentTarget as HTMLInputElement;
											input.select();
										}}
									/>
									<button
										type="button"
										className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-base p-1 text-main-foreground/80 hover:text-main-foreground hover:bg-border/30 cursor-pointer transition-colors duration-150 disabled:opacity-50"
										onClick={async () => {
											const key = integrationKey?.integrationId;
											if (!key) return;
											try {
												await navigator.clipboard.writeText(key);
												setCopied(true);
												setTimeout(() => setCopied(false), 1500);
											} catch {
												// ignore errors
											}
										}}
										disabled={!integrationKey?.integrationId}
										aria-label="Copy integration key"
										title="Copy"
									>
										<Copy className="size-4" />
									</button>
									{copied && (
										<div className="absolute right-2 -top-7 rounded-base bg-secondary-background border-2 border-border px-2 py-1 text-xs text-main-foreground shadow-sm">
											Copied
										</div>
									)}
								</div>
							</div>
						</div>
					</div>

					<DialogFooter className="flex justify-between">
						<Button
							variant="destructive"
							onClick={async () => {
								try {
									await clearIntegrationKey({});
								} catch {
									// ignore errors
								}
								setManageOpen(false);
							}}
						>
							Disconnect Extension
						</Button>
						<Button variant="neutral" onClick={() => setManageOpen(false)}>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Simple disable confirm when not connected */}
			<Dialog open={confirmOpen} onOpenChange={o => setConfirmOpen(o)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Disable Browser Extension?</DialogTitle>
						<DialogDescription>
							This will stop auto-tracking from the browser extension. You can
							re-enable it anytime.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button onClick={() => setConfirmOpen(false)}>Close</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
