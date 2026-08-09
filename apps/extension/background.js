/**
 * Privacy Shield Extension Background Service Worker
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('[PRIVACY SHIELD]: Service worker initialized & active.');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_SHIELD_STATUS') {
    sendResponse({ status: 'active', version: '2.4.0' });
  }
  return true;
});
