import { useState, useEffect } from 'react';
import { Loader2, Copy, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useIntegrationKey } from '../hooks/useIntegrationKey';

interface IntegrationSettingsProps {
	onSaveSuccess?: () => void;
}

export function IntegrationSettings({
	onSaveSuccess,
}: IntegrationSettingsProps) {
	const integrationKey = useIntegrationKey();
	const [inputValue, setInputValue] = useState('');
	const [copied, setCopied] = useState(false);

	// Initialize input with saved integration key
	useEffect(() => {
		if (integrationKey.integrationId) {
			setInputValue(integrationKey.integrationId);
		}
	}, [integrationKey.integrationId]);

	const handleSave = async () => {
		const success = await integrationKey.saveKey(inputValue);
		if (success) {
			// Redirect immediately without showing success message
			onSaveSuccess?.();
		}
	};

	const handleCopy = async () => {
		if (!integrationKey.integrationId) return;
		try {
			await navigator.clipboard.writeText(integrationKey.integrationId);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch (error) {
			console.error('Failed to copy:', error);
		}
	};

	// Show setup flow if no integration key is set
	if (!integrationKey.hasKey) {
		return (
			<div className="snbex:mt-2 snbex:w-full snbex:px-4 snbex:py-2">
				<div className="snbex:space-y-6">
					<div className="snbex:text-center">
						<h2 className="snbex:text-lg snbex:font-semibold snbex:mb-2">
							To get started...
						</h2>
						<p className="snbex:text-sm snbex:text-gray-600">
							Connect your browser extension to start tracking your learning
							activity automatically.
						</p>
					</div>

					{/* Step 1: Copy Integration Key */}
					<div className="snbex:space-y-3">
						<h3 className="snbex:font-semibold snbex:text-sm">
							Step 1: Copy Your Integration Key
						</h3>
						<div className="snbex:p-4 snbex:rounded-lg snbex:bg-gray-50 snbex:border">
							<p className="snbex:text-sm snbex:text-gray-600 snbex:mb-3">
								Copy this key from your{' '}
								<a
									href="https://stupidneko.com/dashboard"
									target="_blank"
									rel="noopener noreferrer"
									className="snbex:underline snbex:text-blue-700 snbex:hover:text-blue-900"
								>
									dashboard
								</a>{' '}
								and paste it below.
							</p>
							<div className="snbex:flex snbex:items-center snbex:gap-2">
								<div className="snbex:relative snbex:flex-1">
									<Input
										readOnly
										value={integrationKey.integrationId || 'Not generated yet'}
										className="snbex:pr-10"
										onClick={e => {
											const input = e.currentTarget as HTMLInputElement;
											input.select();
										}}
									/>
									<button
										type="button"
										className="snbex:absolute snbex:right-2 snbex:top-1/2 snbex:-translate-y-1/2 snbex:inline-flex snbex:items-center snbex:justify-center snbex:rounded snbex:p-1 snbex:text-gray-600 snbex:hover:text-gray-900 snbex:hover:bg-gray-200 snbex:cursor-pointer snbex:transition-colors snbex:duration-150 snbex:disabled:opacity-50"
										onClick={handleCopy}
										disabled={!integrationKey.integrationId}
										aria-label="Copy integration key"
										title="Copy"
									>
										<Copy className="snbex:size-4" />
									</button>
									{copied && (
										<div className="snbex:absolute snbex:right-2 snbex:-top-7 snbex:rounded snbex:bg-white snbex:border snbex:px-2 snbex:py-1 snbex:text-xs snbex:text-gray-900 snbex:shadow-sm">
											Copied
										</div>
									)}
								</div>
								<Button
									type="button"
									onClick={() =>
										window.open('https://stupidneko.com/dashboard', '_blank')
									}
									disabled={false}
									size="sm"
								>
									Open Dashboard
								</Button>
							</div>
						</div>
					</div>

					{/* Step 2: Paste in Extension */}
					<div className="snbex:space-y-3">
						<h3 className="snbex:font-semibold snbex:text-sm">
							Step 2: Paste Key in Extension
						</h3>
						<div className="snbex:p-4 snbex:rounded-lg snbex:bg-gray-50 snbex:border">
							<p className="snbex:text-sm snbex:text-gray-600">
								Paste the integration key in the input field above and click
								"Set" to establish the connection. Once connected, you'll see
								your profile and can start tracking your learning activity!
							</p>
						</div>
					</div>

					{/* Help Link */}
					<div className="snbex:text-center">
						<Button
							variant="neutral"
							size="sm"
							onClick={() =>
								window.open('https://stupidneko.com/dashboard', '_blank')
							}
							className="snbex:gap-2"
						>
							<ExternalLink className="snbex:w-4 snbex:h-4" />
							Open Dashboard
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div>
			<h2 className="snbex:text-base snbex:font-semibold">
				Browser Integration
			</h2>
			<p className="snbex:mt-1 snbex:text-xs snbex:text-gray-600">
				Update your Integration ID from your{' '}
				<a
					href="https://stupidneko.com/dashboard"
					target="_blank"
					rel="noopener noreferrer"
					className="snbex:underline snbex:text-blue-700 snbex:hover:text-blue-900"
				>
					dashboard
				</a>{' '}
				if needed.
			</p>
			<div className="snbex:mt-3 snbex:flex snbex:items-center snbex:gap-2">
				<Input
					placeholder="sn_int_..."
					value={inputValue}
					onChange={e => setInputValue(e.target.value)}
					disabled={integrationKey.saving}
				/>
				<Button
					onClick={handleSave}
					disabled={integrationKey.saving || !inputValue.trim()}
				>
					{integrationKey.saving ? (
						<span className="snbex:inline-flex snbex:items-center snbex:gap-2">
							<Loader2 className="snbex:h-4 snbex:w-4 snbex:animate-spin" />
						</span>
					) : (
						'Set'
					)}
				</Button>
			</div>
			{integrationKey.error && (
				<div className="snbex:mt-2 snbex:text-xs snbex:text-red-600">
					{integrationKey.error}
				</div>
			)}
		</div>
	);
}
