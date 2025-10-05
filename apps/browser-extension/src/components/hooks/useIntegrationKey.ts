import { useState, useCallback } from 'react';
import { useStorage } from './useStorage';
import { callBackground } from '../../messaging/messagesContentRouter';

import { createLogger } from '../../lib/logger';
const log = createLogger('popup', 'settings:integration-key');

export function useIntegrationKey() {
	const { value: integrationId, setValue: setIntegrationId } = useStorage(
		'integrationId',
		''
	);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const saveKey = useCallback(
		async (key: string) => {
			const trimmedKey = key.trim();
			setError(null);

			if (!trimmedKey) {
				setError('Integration ID is required.');
				return false;
			}

			// Validate integration key format
			if (!trimmedKey.startsWith('sn_int_')) {
				setError("Invalid integration key format. Should start with 'sn_int_'");
				return false;
			}

			setSaving(true);

			try {
				log.info('Saving integration key:', trimmedKey);

				// Save to storage
				await setIntegrationId(trimmedKey);
				log.info('Saved to storage successfully');

				// Refresh auth state with timeout
				const response = await new Promise<{
					ok: boolean;
					auth?: { isAuthed: boolean; me: unknown; };
				}>((resolve, reject) => {
					const timeout = setTimeout(() => {
						reject(
							new Error(
								'Authentication request timed out. Please check your connection and try again.'
							)
						);
					}, 10000); // 10 second timeout

					callBackground('REFRESH_AUTH', {})
						.then(resp => {
							clearTimeout(timeout);
							log.info('Auth response:', resp);
							resolve({
								ok: resp.ok,
								auth: resp.auth,
							});
						})
						.catch(error => {
							clearTimeout(timeout);
							log.error('Auth error:', error);
							reject(error);
						});
				});

				const isAuthenticated =
					response.ok && response.auth?.isAuthed && response.auth?.me;

				if (isAuthenticated) {
					log.info('Authentication successful');
					setSaving(false);
					return true;
				} else {
					log.info('Authentication failed:', response);
					setError('Invalid Integration ID. Please verify and try again.');
					setSaving(false);
					return false;
				}
			} catch (err) {
				log.error('Error during save:', err);
				const errorMessage =
					err instanceof Error ? err.message : 'Failed to save Integration ID.';
				setError(errorMessage);
				setSaving(false);
				return false;
			}
		},
		[setIntegrationId]
	);

	return {
		integrationId,
		hasKey: !!integrationId,
		saving,
		error,
		saveKey,
		clearError: () => setError(null),
	};
}
