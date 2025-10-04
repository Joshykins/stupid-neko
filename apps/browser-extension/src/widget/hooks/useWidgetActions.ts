import { useCallback } from 'react';
import { callBackground } from '../../messaging/messagesContentRouter';

export function useWidgetActions() {
	const sendConsentResponse = useCallback(async (consent: boolean) => {
		try {
			await callBackground('WIDGET_ACTION', {
				action: 'consent-response',
				payload: { consent },
			});
		} catch (error) {
			console.error('Failed to send consent response:', error);
		}
	}, []);

	const stopRecording = useCallback(async () => {
		try {
			await callBackground('WIDGET_ACTION', { action: 'stop-recording' });
		} catch (error) {
			console.error('Failed to stop recording:', error);
		}
	}, []);

	const retry = useCallback(async () => {
		try {
			await callBackground('WIDGET_ACTION', { action: 'retry' });
		} catch (error) {
			console.error('Failed to retry:', error);
		}
	}, []);

	const blacklistContent = useCallback(async () => {
		try {
			await callBackground('WIDGET_ACTION', { action: 'blacklist-content' });
		} catch (error) {
			console.error('Failed to blacklist content:', error);
		}
	}, []);

	const testWidget = useCallback(async () => {
		try {
			await callBackground('WIDGET_ACTION', {
				action: 'test',
				payload: { test: true },
			});
		} catch (error) {
			console.error('Failed to test widget:', error);
		}
	}, []);

	return {
		sendConsentResponse,
		stopRecording,
		retry,
		testWidget,
		blacklistContent,
	};
}
