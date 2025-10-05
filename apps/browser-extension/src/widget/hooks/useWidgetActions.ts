import { useCallback } from 'react';
import { callBackground } from '../../messaging/messagesContentRouter';

export function useWidgetActions() {
    // Provider-scoped actions (new, preferred)
    const defaultOpenAlwaysTrackQuestion = useCallback(async () => {
        try {
            await callBackground('WIDGET_ACTION', {
                action: 'default.open-always-track-question',
            });
        } catch (error) {
            console.error('Failed to open always-track question (default):', error);
        }
    }, []);

    const defaultDontTrack = useCallback(async () => {
        try {
            await callBackground('WIDGET_ACTION', { action: 'default.dont-track' });
        } catch (error) {
            console.error('Failed to set dont-track (default):', error);
        }
    }, []);

    const defaultQuestionTrackOnce = useCallback(async () => {
        try {
            await callBackground('WIDGET_ACTION', { action: 'default.question-track-once' });
        } catch (error) {
            console.error('Failed to start tracking once (default):', error);
        }
    }, []);

    const defaultQuestionAlwaysTrack = useCallback(async () => {
        try {
            await callBackground('WIDGET_ACTION', { action: 'default.question-always-track' });
        } catch (error) {
            console.error('Failed to always track (default):', error);
        }
    }, []);

    const defaultStopRecording = useCallback(async () => {
        try {
            await callBackground('WIDGET_ACTION', { action: 'default.stop-recording' });
        } catch (error) {
            console.error('Failed to stop recording (default):', error);
        }
    }, []);

    const defaultTrackAnyway = useCallback(async () => {
        try {
            await callBackground('WIDGET_ACTION', { action: 'default.track-anyway' });
        } catch (error) {
            console.error('Failed to track anyway (default):', error);
        }
    }, []);

    const youtubeStopRecording = useCallback(async () => {
        try {
            await callBackground('WIDGET_ACTION', { action: 'youtube.stop-recording' });
        } catch (error) {
            console.error('Failed to stop recording (YouTube):', error);
        }
    }, []);

    const youtubeBlockContent = useCallback(async () => {
        try {
            await callBackground('WIDGET_ACTION', { action: 'youtube.block-content' });
        } catch (error) {
            console.error('Failed to block content (YouTube):', error);
        }
    }, []);

    const youtubeTrackAnyway = useCallback(async () => {
        try {
            await callBackground('WIDGET_ACTION', { action: 'youtube.track-anyway' });
        } catch (error) {
            console.error('Failed to track anyway (YouTube):', error);
        }
    }, []);



	return {
		// Provider-scoped actions
        defaultOpenAlwaysTrackQuestion,
        defaultDontTrack,
        defaultQuestionTrackOnce,
        defaultQuestionAlwaysTrack,
        defaultStopRecording,
        defaultTrackAnyway,
        youtubeStopRecording,
        youtubeBlockContent,
        youtubeTrackAnyway,

	};
}
