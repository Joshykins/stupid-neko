import type { FunctionReturnType } from 'convex/server';
import { useEffect, useState } from 'react';
import type { api } from '../../../../../convex/_generated/api';
import { callBackground } from '../../messaging/messagesContentRouter';

// Infer types from Convex functions
type MeFromIntegration = FunctionReturnType<
	typeof api.browserExtension.browserExtensionCoreFunctions.meFromIntegration
>;

// AuthMe should match the structure returned by browser extension functions
type AuthMe = NonNullable<MeFromIntegration>;

type AuthState = {
	isAuthed: boolean;
	me: AuthMe | null;
	loading: boolean;
	error?: string;
};

export function useAuth(): AuthState {
	const [state, setState] = useState<AuthState>({
		isAuthed: false,
		me: null,
		loading: true,
	});

	useEffect(() => {
		let mounted = true;

		const requestAuth = async () => {
			try {
				const response = await callBackground('GET_AUTH_STATE', {});
				if (!mounted) return;

				const me: AuthMe | null = response.me
					? ({ ...response.me } as AuthMe)
					: null;
				setState({
					isAuthed: response.isAuthed,
					me,
					loading: false,
					error: undefined,
				});
			} catch (e: unknown) {
				if (!mounted) return;
				const errorMessage = e instanceof Error ? e.message : 'failed';
				setState({
					isAuthed: false,
					me: null,
					loading: false,
					error: errorMessage,
				});
			}
		};

		// Initial fetch
		requestAuth();

		// Re-fetch when integrationId changes in storage
		const onStorageChange = (
			changes: { [key: string]: chrome.storage.StorageChange; },
			area: string
		) => {
			if (
				area === 'sync' &&
				changes &&
				Object.hasOwn(changes, 'integrationId')
			) {
				setState(s => ({ ...s, loading: true }));
				requestAuth();
			}
		};
		try {
			chrome.storage.onChanged.addListener(onStorageChange);
		} catch {
			/* noop */
			void 0;
		}

		return () => {
			mounted = false;
			try {
				chrome.storage.onChanged.removeListener(onStorageChange);
			} catch {
				/* noop */
				void 0;
			}
		};
	}, []);

	return state;
}
