import { useEffect, useState } from 'react';
import { callBackground } from '../../messaging/messagesContentRouter';
import { createLogger } from '../../lib/logger';
const log = createLogger('popup', 'popup:content-label');

export function useContentLabel(contentKey: string | null | undefined) {
	const [label, setLabel] = useState<any | null>(null);
	const [loading, setLoading] = useState<boolean>(!!contentKey);

	useEffect(() => {
		let mounted = true;
		async function run() {
			if (!contentKey) {
				setLoading(false);
				return;
			}
			try {
				const response = await callBackground('GET_CONTENT_LABEL', {
					contentKey,
				});
				if (!mounted) return;
				setLabel(response.contentLabel);
				setLoading(false);
			} catch (error) {
				if (!mounted) return;
				log.error('Failed to get content label:', error);
				setLoading(false);
			}
		}
		run();
		return () => {
			mounted = false;
		};
	}, [contentKey]);

	return { label, loading } as const;
}
