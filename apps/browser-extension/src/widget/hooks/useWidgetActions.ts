import { useCallback } from 'react';
import { callBackground } from '../../messaging/messagesContentRouter';
import { createLogger } from '../../lib/logger';
const log = createLogger('content', 'widget:ui');

export function useWidgetActions() {
    // Provider-scoped actions (new, preferred)
    const defaultOpenAlwaysTrackQuestion = useCallback(async () => {
        try {
            await callBackground('WIDGET_ACTION', {
                action: 'website-provider.open-always-track-question',
            });
        } catch (error) {
            log.error('Failed to open always-track question (default):', error);
        }
    }, []);

    const defaultDontTrack = useCallback(async () => {
        try {
            await callBackground('WIDGET_ACTION', { action: 'website-provider.dont-track' });
        } catch (error) {
            log.error('Failed to set dont-track (default):', error);
        }
    }, []);

    const defaultQuestionTrackOnce = useCallback(async () => {
        try {
            await callBackground('WIDGET_ACTION', { action: 'website-provider.question-track-once' });
        } catch (error) {
            log.error('Failed to start tracking once (default):', error);
        }
    }, []);

    const defaultQuestionAlwaysTrack = useCallback(async () => {
        try {
            await callBackground('WIDGET_ACTION', { action: 'website-provider.question-always-track' });
        } catch (error) {
            log.error('Failed to always track (default):', error);
        }
    }, []);

    const defaultStopRecording = useCallback(async () => {
        try {
            await callBackground('WIDGET_ACTION', { action: 'website-provider.stop-recording' });
        } catch (error) {
            log.error('Failed to stop recording (default):', error);
        }
    }, []);

    const defaultTrackAnyway = useCallback(async () => {
        try {
            await callBackground('WIDGET_ACTION', { action: 'website-provider.track-anyway' });
        } catch (error) {
            log.error('Failed to track anyway (default):', error);
        }
    }, []);

    const youtubeStopRecording = useCallback(async () => {
        try {
            await callBackground('WIDGET_ACTION', { action: 'youtube.stop-recording' });
        } catch (error) {
            log.error('Failed to stop recording (YouTube):', error);
        }
    }, []);

    const youtubeBlockContent = useCallback(async () => {
        try {
            await callBackground('WIDGET_ACTION', { action: 'youtube.block-content' });
        } catch (error) {
            log.error('Failed to block content (YouTube):', error);
        }
    }, []);

    const youtubeTrackAnyway = useCallback(async () => {
        try {
            await callBackground('WIDGET_ACTION', { action: 'youtube.track-anyway' });
        } catch (error) {
            log.error('Failed to track anyway (YouTube):', error);
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
