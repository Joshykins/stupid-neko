import type { ContentActivityEvent } from '../../background/providers/types';
import { callBackground } from '../../../messaging/messagesContentRouter';
import { websiteContentHandler } from '../../background/providers/website';

let userTargetLanguage: string | undefined;

export default {
	start(cb?: (e: ContentActivityEvent) => void, targetLanguage?: string) {
		userTargetLanguage = targetLanguage;

		const forward = (e: ContentActivityEvent) => {
			if (cb) cb(e);
			callBackground('CONTENT_ACTIVITY_EVENT', { payload: e }).catch(() => {});
		};
		websiteContentHandler.start(forward);

		// Trigger language detection after a short delay to ensure page is loaded
		setTimeout(() => {
			if (websiteContentHandler.checkLanguageMatch) {
				websiteContentHandler.checkLanguageMatch(userTargetLanguage);
			}
		}, 1000);
	},
	stop() {
		websiteContentHandler.stop();
	},
};
