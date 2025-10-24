import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
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

	// Show setup flow if no integration key is set
	if (!integrationKey.hasKey) {
		return (
			<div className="snbex:w-full">
				<div className="snbex:space-y-3 snbex:text-left">
					<p className="snbex:text-xs snbex:text-gray-600">
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
						<Input
							value={inputValue}
							onChange={e => setInputValue(e.target.value)}
							placeholder="Paste your integration key here..."
							className="flex-1"
						/>
						<Button
							onClick={handleSave}
							disabled={integrationKey.saving || !inputValue.trim()}
							size="sm"
						>
							{integrationKey.saving ? (
								<span className="snbex:inline-flex snbex:items-center snbex:gap-2">
									<Loader2 className="snbex:h-3 snbex:w-3 snbex:animate-spin" />
									Set
								</span>
							) : (
								'Set'
							)}
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
