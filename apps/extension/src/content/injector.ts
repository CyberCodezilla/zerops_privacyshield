import { sanitizeTextClientSide } from '../engine/localSanitizer';
import { getConfig, incrementRedactedStats } from '../utils/storage';

console.log('🛡️ PrivacyShield Extension active on page:', window.location.hostname);

let currentTokenMap = new Map<string, string>();
let badgeElement: HTMLDivElement | null = null;

// Create floating security badge UI
function injectSecurityBadge() {
  if (document.getElementById('privacyshield-badge')) return;

  badgeElement = document.createElement('div');
  badgeElement.id = 'privacyshield-badge';
  badgeElement.setAttribute(
    'style',
    `
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 999999;
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95));
    border: 1px solid rgba(16, 185, 129, 0.4);
    border-radius: 9999px;
    padding: 8px 16px;
    color: #6ee7b7;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(16, 185, 129, 0.2);
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    backdrop-filter: blur(12px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  `
  );

  badgeElement.innerHTML = `
    <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981;"></span>
    <span>🛡️ PrivacyShield Active</span>
  `;

  document.body.appendChild(badgeElement);
}

// Find ChatGPT / Claude active prompt input box
function getInputElement(): HTMLTextAreaElement | HTMLDivElement | null {
  return (
    document.querySelector('#prompt-textarea') ||
    document.querySelector('textarea[data-id]') ||
    document.querySelector('textarea') ||
    document.querySelector('div[contenteditable="true"]')
  );
}

// Intercept prompt send and sanitize PII
async function processPromptInterception(inputEl: HTMLTextAreaElement | HTMLDivElement) {
  const config = await getConfig();
  if (!config.enabled) return;

  const rawText = 'value' in inputEl ? inputEl.value : inputEl.innerText || '';
  if (!rawText || !rawText.trim()) return;

  // Async call to Zerops Nemotron PII endpoint via localSanitizer
  const result = await sanitizeTextClientSide(rawText, config.apiUrl, config.activeProfile);

  if (result.tokensRedactedCount > 0) {
    // Store token mappings for response rehydration
    result.tokenMap.forEach((val, key) => currentTokenMap.set(key, val));

    // Update Input Box text with sanitized prompt
    if ('value' in inputEl) {
      inputEl.value = result.sanitizedText;
    } else {
      inputEl.innerText = result.sanitizedText;
    }

    // Trigger input events so ChatGPT React state updates
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));

    // Increment extension lifetime stats
    await incrementRedactedStats(result.tokensRedactedCount);

    // Update Badge UI
    if (badgeElement) {
      badgeElement.style.borderColor = 'rgba(16, 185, 129, 0.8)';
      badgeElement.innerHTML = `
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #34d399; box-shadow: 0 0 10px #34d399;"></span>
        <span>🔒 ${result.tokensRedactedCount} PII Redacted</span>
      `;

      setTimeout(() => {
        if (badgeElement) {
          badgeElement.innerHTML = `
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981;"></span>
            <span>🛡️ PrivacyShield Active</span>
          `;
        }
      }, 3500);
    }
  }
}

// Attach listener to keydown and click
function attachListeners() {
  injectSecurityBadge();

  document.addEventListener('keydown', async (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const inputEl = getInputElement();
      if (inputEl && (document.activeElement === inputEl || inputEl.contains(document.activeElement as Node))) {
        await processPromptInterception(inputEl);
      }
    }
  }, true);

  document.addEventListener('click', async (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target &&
      (target.getAttribute('data-testid') === 'send-button' ||
        target.closest('[data-testid="send-button"]') ||
        target.querySelector('svg') ||
        target.tagName === 'BUTTON')
    ) {
      const inputEl = getInputElement();
      if (inputEl) {
        await processPromptInterception(inputEl);
      }
    }
  }, true);
}

// Observe DOM updates for streaming response rehydration
const observer = new MutationObserver(() => {
  if (currentTokenMap.size === 0) return;

  const textNodes: Node[] = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);

  let node: Node | null;
  while ((node = walk.nextNode())) {
    if (node.nodeValue) {
      for (const [token, original] of currentTokenMap.entries()) {
        if (node.nodeValue.includes(token)) {
          node.nodeValue = node.nodeValue.replace(token, `${original} 🔒[Shield Verified]`);
        }
      }
    }
  }
});

// Run script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    attachListeners();
    observer.observe(document.body, { childList: true, subtree: true });
  });
} else {
  attachListeners();
  observer.observe(document.body, { childList: true, subtree: true });
}
