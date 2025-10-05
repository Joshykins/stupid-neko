import { useEffect, useState } from 'react';
import { createLogger } from '../../lib/logger';
const log = createLogger('popup', 'popup:hooks');

type StorageKeys = 'integrationId' | 'widgetEnabled';

export function useStorage<T>(key: StorageKeys, defaultValue: T) {
	const [value, setValue] = useState<T>(defaultValue);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadValue = async () => {
			try {
				chrome.storage.sync.get([key], items => {
					const storedValue = items[key] as T | undefined;
					setValue(storedValue !== undefined ? storedValue : defaultValue);
					setLoading(false);
				});
			} catch (error) {
				log.error(`Failed to load ${key}:`, error);
				setValue(defaultValue);
				setLoading(false);
			}
		};

		loadValue();
	}, [key, defaultValue]);

	const updateValue = async (newValue: T) => {
		try {
			await new Promise<void>((resolve, reject) => {
				chrome.storage.sync.set({ [key]: newValue }, () => {
					if (chrome.runtime.lastError) {
						reject(chrome.runtime.lastError);
					} else {
						resolve();
					}
				});
			});
			setValue(newValue);
		} catch (error) {
			log.error(`Failed to save ${key}:`, error);
			throw error;
		}
	};

	return { value, setValue: updateValue, loading };
}
