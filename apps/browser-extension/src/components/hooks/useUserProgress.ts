import { useState, useEffect } from 'react';
import { callBackground } from '../../messaging/messagesContentRouter';
import { createLogger } from '../../lib/logger';

const log = createLogger('popup', 'popup:hooks');

export type UserProgress = {
	name?: string;
	image?: string;
	currentStreak?: number;
	longestStreak?: number;
	languageCode?: string;
	totalMsLearning?: number;
	userCreatedAt: number;
	targetLanguageCreatedAt: number;
	currentLevel: number;
	nextLevelXp: number;
	experienceTowardsNextLevel: number;
	hasPreReleaseCode: boolean;
};

export function useUserProgress() {
	const [progress, setProgress] = useState<UserProgress | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchProgress = async () => {
			try {
				setLoading(true);
				setError(null);

				const result = await callBackground('GET_USER_PROGRESS', {});

				if (result.success && result.data) {
					setProgress(result.data);
				} else {
					log.warn('Failed to fetch user progress:', result.error);
					setError(result.error || 'Failed to fetch progress');
				}
			} catch (err) {
				log.error('Error fetching user progress:', err);
				setError(err instanceof Error ? err.message : 'Unknown error');
			} finally {
				setLoading(false);
			}
		};

		fetchProgress();
	}, []);

	return { progress, loading, error };
}
