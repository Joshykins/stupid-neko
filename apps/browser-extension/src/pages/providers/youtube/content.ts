import type { ContentActivityEvent } from "../../background/providers/types";
import { callBackground } from "../../../messaging/messagesContentRouter";
import { youtubeContentHandler } from "../../background/providers/youtube";

export default {
	start(cb?: (e: ContentActivityEvent) => void) {
		const forward = (e: ContentActivityEvent) => {
			if (cb) cb(e);
			callBackground("CONTENT_ACTIVITY_EVENT", { payload: e }).catch(() => {});
		};
		youtubeContentHandler.start(forward);
	},
	stop() {
		youtubeContentHandler.stop();
	},
};
