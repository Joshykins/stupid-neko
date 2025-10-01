// Background script entry point

console.log('background script loaded');

// Import modules
import { invalidateAuthCache } from './auth';
import {
	handleTabActivated,
	handleTabRemoved,
	handleTabUpdated,
} from './content-activity-router';
import { registerMessageHandlers } from './message-handlers';
import { initializeWidgetState } from './widget';

// Initialize background script modules

// Register message handlers
registerMessageHandlers();

// Set up event listeners
chrome.tabs.onRemoved.addListener(tabId => {
	handleTabRemoved(tabId);
});

chrome.tabs.onActivated.addListener(activeInfo => {
	console.debug('[bg] Tab activated:', activeInfo.tabId);
	handleTabActivated(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
	console.debug('[bg] Tab updated:', tabId, changeInfo);
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
