// Background script entry point

// Import modules
import { createLogger } from '../../lib/logger';
import { invalidateAuthCache } from './auth';
import {
	handleTabActivated,
	handleTabRemoved,
	handleTabUpdated,
} from './content-activity-router';
import { registerMessageHandlers } from './message-handlers';
import { initializeWidgetState } from './widget';

const log = createLogger('service-worker', 'handlers:bg');
log.info('background script loaded');

// Initialize background script modules

// Register message handlers
registerMessageHandlers();

// Set up event listeners
chrome.tabs.onRemoved.addListener(tabId => {
	handleTabRemoved(tabId);
});

chrome.tabs.onActivated.addListener(activeInfo => {
	log.debug('Tab activated:', activeInfo.tabId);
	handleTabActivated(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
	log.debug('Tab updated:', tabId, changeInfo);
	handleTabUpdated(tabId, changeInfo);
});

// When the Integration ID changes, invalidate cached auth state
chrome.storage.onChanged.addListener((changes, area) => {
	if (area === 'sync' && changes && Object.hasOwn(changes, 'integrationId')) {
		invalidateAuthCache();
	}
});

// Initialize widget state when background script loads
initializeWidgetState();
