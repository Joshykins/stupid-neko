import type { FunctionReturnType } from "convex/server";
import { useEffect, useState } from "react";
import type { api } from "../../../../../convex/_generated/api";

// Infer types from Convex functions
type MeFromIntegration = FunctionReturnType<
	typeof api.browserExtensionFunctions.meFromIntegration
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

		const requestAuth = () => {
			try {
				chrome.runtime.sendMessage({ type: "GET_AUTH_STATE" }, (resp) => {
					if (!mounted) return;
					const r =
						(resp as {
							isAuthed?: boolean;
							me?: Partial<AuthMe> | null;
						} | null) || {};
					const me: AuthMe | null = r?.me ? ({ ...r.me } as AuthMe) : null;
					setState({ isAuthed: !!r?.isAuthed, me, loading: false });
				});
			} catch (e: unknown) {
				if (!mounted) return;
				const errorMessage = e instanceof Error ? e.message : "failed";
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
			changes: { [key: string]: chrome.storage.StorageChange },
			area: string,
		) => {
			if (
				area === "sync" &&
				changes &&
				Object.hasOwn(changes, "integrationId")
			) {
				setState((s) => ({ ...s, loading: true }));
				requestAuth();
			}
		};
		try {
			chrome.storage.onChanged.addListener(onStorageChange);
		} catch {}

		return () => {
			mounted = false;
			try {
				chrome.storage.onChanged.removeListener(onStorageChange);
			} catch {}
		};
	}, []);

	return state;
}
