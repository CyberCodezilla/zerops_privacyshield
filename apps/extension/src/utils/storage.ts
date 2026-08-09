export interface ExtensionConfig {
  apiUrl: string;
  zeroKnowledge: boolean;
  activeProfile: 'STRICT' | 'BALANCED' | 'PERMISSIVE';
  enabled: boolean;
  statsRedactedCount: number;
}

export const DEFAULT_CONFIG: ExtensionConfig = {
  // Configurable Zerops API deployment URL (with localhost fallback option)
  apiUrl: 'https://api-zerops.privacyshield.app',
  zeroKnowledge: true,
  activeProfile: 'BALANCED',
  enabled: true,
  statsRedactedCount: 0
};

export async function getConfig(): Promise<ExtensionConfig> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(DEFAULT_CONFIG, (items) => {
        resolve(items as ExtensionConfig);
      });
    } else {
      // LocalStorage fallback for dev
      const saved = localStorage.getItem('ps_extension_config');
      if (saved) {
        try {
          resolve({ ...DEFAULT_CONFIG, ...JSON.parse(saved) });
          return;
        } catch {}
      }
      resolve(DEFAULT_CONFIG);
    }
  });
}

export async function updateConfig(newConfig: Partial<ExtensionConfig>): Promise<ExtensionConfig> {
  const current = await getConfig();
  const updated = { ...current, ...newConfig };

  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set(updated, () => {
        resolve(updated);
      });
    } else {
      localStorage.setItem('ps_extension_config', JSON.stringify(updated));
      resolve(updated);
    }
  });
}

export async function incrementRedactedStats(count: number): Promise<number> {
  const config = await getConfig();
  const newTotal = (config.statsRedactedCount || 0) + count;
  await updateConfig({ statsRedactedCount: newTotal });
  return newTotal;
}
