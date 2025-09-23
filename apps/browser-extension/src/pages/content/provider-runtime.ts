import { onContent } from "../../messaging/messagesContentRouter";
import type { ContentActivityEvent } from "../background/providers/types";
import { loadContent } from "../providers/registry";

// Minimal content-side runtime to activate/deactivate providers by id

type ProviderContent = {
	start(cb: (e: ContentActivityEvent) => void, targetLanguage?: string): void;
	stop(): void;
};

let active: { id: string; api: ProviderContent } | null = null;

onContent("ACTIVATE_PROVIDER", async ({ providerId, targetLanguage }) => {
	try {
		if (active?.id === providerId) return {};
		if (active) {
			try {
				active.api.stop();
			} catch {}
			active = null;
		}

		const key = Object.keys(loadContent).find((k) =>
			k.includes(`/${providerId}/`),
		);
		if (!key)
			return { error: `Provider content not found: ${providerId}` } as any;

		const mod: any = await loadContent[key]!();
		const api: ProviderContent = mod.default;

		api.start((_e: ContentActivityEvent) => {
			// The provider wrapper already forwards to background; no-op here
		}, targetLanguage);

		active = { id: providerId, api };
		return {};
	} catch (e) {
		return { error: String(e) } as any;
	}
});

onContent("DEACTIVATE_PROVIDER", async () => {
	if (active) {
		try {
			active.api.stop();
		} catch {}
		active = null;
	}
	return {};
});
