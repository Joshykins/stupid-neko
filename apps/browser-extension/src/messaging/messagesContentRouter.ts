import type { MessageMap, MsgKey, Req, Res } from './messages';

type ContentHandler<K extends MsgKey> = (
	req: MessageMap[K]['req'],
	sender: chrome.runtime.MessageSender
) => Res<K> | Promise<Res<K>>;

const handlers: Partial<Record<MsgKey, ContentHandler<MsgKey>>> = {};

export function onContent<K extends MsgKey>(
	type: K,
	handler: ContentHandler<K>
) {
	handlers[type] = handler as unknown as ContentHandler<MsgKey>;
}

chrome.runtime.onMessage.addListener(
	(msg: Req<MsgKey>, sender, sendResponse) => {
		console.debug('[content] Message router received:', msg?.type, msg);
		const handler = handlers[msg?.type as MsgKey];
		if (!handler) {
			console.debug('[content] No handler for message type:', msg?.type);
			return;
		}

		console.debug('[content] Calling handler for:', msg?.type);
		(async () => {
			try {
				const { type: _t, ...payload } = msg as Req<MsgKey>;
				const res = await handler(payload, sender);
				sendResponse(res);
			} catch (e) {
				console.error('[content] Handler error:', e);
				sendResponse({ error: String(e) });
			}
		})();

		return true;
	}
);

export function callBackground<K extends MsgKey>(
	type: K,
	payload: Omit<Req<K>, 'type'>
): Promise<Res<K>> {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage({ type, ...(payload as object) }, resp => {
			const lastErr = chrome.runtime.lastError;
			if (lastErr) return reject(new Error(lastErr.message));
			if (resp?.error) return reject(new Error(resp.error));
			resolve(resp as Res<K>);
		});
	});
}
