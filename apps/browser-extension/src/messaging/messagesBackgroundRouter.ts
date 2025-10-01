// This file is used to register handlers for messages from the content script

import type { MsgKey, Req, Res, MessageMap } from './messages';

type Handler<K extends MsgKey> = (
	req: MessageMap[K]['req'],
	sender: chrome.runtime.MessageSender
) => Res<K> | Promise<Res<K>>;

// Registry of handlers keyed by message type
const handlers: Partial<Record<MsgKey, Handler<MsgKey>>> = {};

// Register a handler
export function on<K extends MsgKey>(type: K, handler: Handler<K>) {
	handlers[type] = handler as unknown as Handler<MsgKey>;
}

// Wire up chrome listener once in your SW entrypoint
chrome.runtime.onMessage.addListener(
	(msg: Req<MsgKey>, sender, sendResponse) => {
		const type = msg?.type as MsgKey;
		const handler = handlers[type];
		if (!handler) return; // fall through to other listeners if any

		(async () => {
			try {
				// Strip the discriminant before passing to handler
				const { type: _t, ...payload } = msg as Req<MsgKey>;
				const res = await handler(payload, sender);
				sendResponse(res);
			} catch (err) {
				// You can standardize error envelopes if you like
				sendResponse({ error: String(err ?? 'Unknown error') });
			}
		})();

		// Return true to keep the message channel open for async response
		return true;
	}
);

// (Optional) wrapper for sending to a specific tab (BG → content)
export function sendToTab<K extends MsgKey>(
	tabId: number,
	type: K,
	payload: Omit<Req<K>, 'type'>
): Promise<Res<K>> {
	return new Promise((resolve, reject) => {
		chrome.tabs.sendMessage(tabId, { type, ...(payload as object) }, resp => {
			const lastErr = chrome.runtime.lastError;
			if (lastErr) {
				// Handle specific cases where content script might not be ready
				const errorMessage = lastErr.message || 'Unknown error';
				if (errorMessage.includes('Receiving end does not exist') || 
					errorMessage.includes('Could not establish connection')) {
					// This is expected for some tabs, don't treat as error
					console.debug(`[messaging] Content script not ready for tab ${tabId}: ${errorMessage}`);
					return reject(new Error(errorMessage)); // Reject so retry mechanism can work
				}
				return reject(new Error(errorMessage));
			}
			if (resp?.error) return reject(new Error(resp.error));
			resolve(resp as Res<K>);
		});
	});
}
