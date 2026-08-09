import { getConfig } from '../utils/storage';

console.log('[PrivacyShield Extension] Background service worker initialized.');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[PrivacyShield Extension] Installed successfully.');
});

// Listener for background messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_CONFIG') {
    getConfig().then((config) => sendResponse({ success: true, config }));
    return true; // Keep message channel open for async response
  }
  if (request.action === 'CHECK_HEALTH') {
    getConfig().then(async (config) => {
      try {
        const res = await fetch(`${config.apiUrl}/health`, { method: 'GET' });
        sendResponse({ success: res.ok, status: res.status });
      } catch (err: any) {
        sendResponse({ success: false, error: err.message });
      }
    });
    return true;
  }
});
