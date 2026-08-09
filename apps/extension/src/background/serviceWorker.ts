interface ExtensionConfig {
  apiUrl: string;
  zeroKnowledge: boolean;
  activeProfile: 'STRICT' | 'BALANCED' | 'PERMISSIVE';
  enabled: boolean;
  statsRedactedCount: number;
}

const DEFAULT_CONFIG: ExtensionConfig = {
  apiUrl: 'https://api-zerops.privacyshield.app',
  zeroKnowledge: true,
  activeProfile: 'BALANCED',
  enabled: true,
  statsRedactedCount: 0
};

async function getConfig(): Promise<ExtensionConfig> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(DEFAULT_CONFIG, (items) => {
        resolve(items as ExtensionConfig);
      });
    } else {
      resolve(DEFAULT_CONFIG);
    }
  });
}

console.log('[PrivacyShield Extension] Background service worker initialized.');

chrome.runtime.onInstalled.addListener(() => {
  console.log('[PrivacyShield Extension] Installed successfully.');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_CONFIG') {
    getConfig().then((config) => sendResponse({ success: true, config }));
    return true;
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

export {};
