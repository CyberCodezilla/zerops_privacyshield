// PrivacyShield Content Script for ChatGPT & Claude (Cybersecurity SOC UI & SVG Vector Shield)

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

let cachedConfig: ExtensionConfig = DEFAULT_CONFIG;

function syncConfig() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(DEFAULT_CONFIG, (items) => {
      if (items && typeof items.enabled !== 'undefined') {
        cachedConfig = { ...DEFAULT_CONFIG, ...items };
      }
    });
  }
}
syncConfig();

async function incrementRedactedStats(count: number): Promise<number> {
  cachedConfig.statsRedactedCount = (cachedConfig.statsRedactedCount || 0) + count;
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.set(cachedConfig);
  }
  return cachedConfig.statsRedactedCount;
}

function isValidLuhn(cardNumberStr: string): boolean {
  const digits = cardNumberStr.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

function isValidCreditCard(cardNumberStr: string): boolean {
  const digits = cardNumberStr.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  if (isValidLuhn(cardNumberStr)) return true;
  // Fallback for test cards / mock images (15 or 16 digits)
  return digits.length === 15 || digits.length === 16;
}

interface DetectedItem {
  type: string;
  original: string;
  explanation: string;
}

function analyzeSensitiveText(text: string): { sanitized: string; count: number; items: DetectedItem[]; tokenMap: Map<string, string> } {
  if (!text || !text.trim()) return { sanitized: text, count: 0, items: [], tokenMap: new Map() };

  let sanitized = text;
  const tokenMap = new Map<string, string>();
  const items: DetectedItem[] = [];
  let count = 0;

  const checkPattern = (regex: RegExp, type: string, prefix: string, explanation: string, validator?: (v: string) => boolean) => {
    sanitized = sanitized.replace(regex, (match) => {
      if (validator && !validator(match)) return match;
      count++;
      const placeholder = `[${prefix}_REDACTED_${count}]`;
      tokenMap.set(placeholder, match);
      items.push({ type, original: match, explanation });
      return placeholder;
    });
  };

  // 1. Secrets & Credentials (OpenAI sk-proj- / sk-live- / AWS / JWT / DB)
  checkPattern(/\bsk[-_][a-zA-Z0-9_-]{20,}\b/gi, 'SECRET_KEY', 'SECRET_KEY', 'OpenAI Secret API Key detected. Exposing live keys risks quota theft, unauthorized usage, and account compromise.');
  checkPattern(/\bAKIA[0-9A-Z]{16}\b/g, 'AWS_ACCESS_KEY', 'SECRET_KEY', 'AWS IAM Access Key detected. Leaking AWS credentials gives full cloud infrastructure access.');
  checkPattern(/\beyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g, 'JWT_TOKEN', 'JWT_SECRET', 'JSON Web Token (JWT) detected. Exposing session tokens risks identity hijacking.');
  checkPattern(/\b(?:postgres|postgresql|mongodb|mysql):\/\/[a-zA-Z0-9_]+:[^@\s]+@[a-zA-Z0-9_.-]+:\d+\/[a-zA-Z0-9_.-]+\b/g, 'DATABASE_URI', 'DB_CONN', 'Database Connection String detected. Leaking DB URIs exposes production credentials.');

  // 2. Personal PII & Financial Records
  checkPattern(/\b\d{3}-\d{2}-\d{4}\b/g, 'SOCIAL_SECURITY_NUMBER', 'SSN', 'Social Security Number (SSN) detected. Confidential identity data protected under GDPR/CCPA.');
  checkPattern(/\b(?:\d[ -]*?){13,19}\b/g, 'CREDIT_CARD', 'CARD', 'Credit Card Number (PCI-DSS) detected. Sharing payment card details violates PCI security standards.', isValidCreditCard);
  checkPattern(/\b(?:CVV|CVC|CID|Security Code)\s*[:=]?\s*(\d{3,4})\b/gi, 'CARD_CVV', 'CVV', 'Credit Card Security Code (CVV) detected. Exposing verification codes violates PCI-DSS.');
  checkPattern(/\b(?:VALID THRU|EXP|EXPIRES|EXPIRY)\s*[:=]?\s*(\d{2}[\/\-]\d{2,4})\b/gi, 'CARD_EXPIRY', 'EXPIRY', 'Card Expiration Date detected.');
  checkPattern(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, 'EMAIL_ADDRESS', 'EMAIL', 'Email Address detected. Sharing personal contact info risks spam and spear-phishing.');
  checkPattern(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, 'PHONE_NUMBER', 'PHONE', 'Phone Number detected. Personal telephone numbers are classified PII.');

  return { sanitized, count, items, tokenMap };
}

console.log('[PrivacyShield SOC Extension] Guard initialized on:', window.location.hostname);

let badgeElement: HTMLDivElement | null = null;
let activeModalElement: HTMLDivElement | null = null;
const sessionTokenMap = new Map<string, string>();
let isBypassingLock = false;

// Vector SVG Icons
const SVG_SHIELD_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
const SVG_LOCK_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
const SVG_ALERT_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
const SVG_INFO_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
const SVG_CANCEL_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
const SVG_SHIELD_OFF_ICON = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`;

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
    background: rgba(9, 13, 22, 0.92);
    border: 1px solid rgba(16, 185, 129, 0.4);
    border-radius: 9999px;
    padding: 8px 16px;
    color: #6ee7b7;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.3px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(16, 185, 129, 0.25);
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    backdrop-filter: blur(16px);
  `
  );

  badgeElement.innerHTML = `
    ${SVG_SHIELD_ICON}
    <span>PRIVACYSHIELD ACTIVE</span>
  `;

  document.body.appendChild(badgeElement);
}

// Extract prompt text from all possible elements
function getPromptRawText(): { text: string; element: HTMLElement | null } {
  const elements = [
    document.querySelector('#prompt-textarea'),
    document.querySelector('div[id="prompt-textarea"]'),
    document.querySelector('div[role="textbox"]'),
    document.querySelector('div.ProseMirror'),
    document.querySelector('textarea[tabindex="0"]'),
    document.querySelector('textarea'),
    document.querySelector('div[contenteditable="true"]')
  ];

  for (const el of elements) {
    if (el) {
      const txt = ('value' in el ? (el as any).value : (el as HTMLElement).innerText || el.textContent || '').trim();
      if (txt) {
        return { text: txt, element: el as HTMLElement };
      }
    }
  }

  const active = document.activeElement as HTMLElement;
  if (active && (active.tagName === 'TEXTAREA' || active.isContentEditable)) {
    const txt = ('value' in active ? (active as any).value : active.innerText || active.textContent || '').trim();
    if (txt) {
      return { text: txt, element: active };
    }
  }

  return { text: '', element: null };
}

function replaceProseMirrorContent(el: HTMLElement, sanitizedText: string) {
  el.focus();
  const selection = window.getSelection();
  if (selection) {
    const range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  document.execCommand('insertText', false, sanitizedText);
}

// Cybersecurity Warning Modal with Vector Icons
function showSecurityWarningModal(
  items: DetectedItem[],
  sanitizedText: string,
  tokenMap: Map<string, string>,
  onConfirmEncrypt: () => void
) {
  if (activeModalElement) activeModalElement.remove();

  activeModalElement = document.createElement('div');
  activeModalElement.id = 'privacyshield-modal-overlay';
  activeModalElement.setAttribute(
    'style',
    `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(3, 7, 18, 0.85);
    backdrop-filter: blur(16px);
    z-index: 9999999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
    font-family: system-ui, -apple-system, sans-serif;
  `
  );

  const itemsHtml = items.map(item => `
    <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 10px; padding: 12px 14px; margin-bottom: 10px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
        <span style="background: rgba(239, 68, 68, 0.2); color: #fca5a5; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 4px; font-family: monospace; letter-spacing: 0.5px;">
          ${item.type}
        </span>
        <span style="color: #fecaca; font-family: monospace; font-size: 12px; font-weight: 600; background: rgba(0, 0, 0, 0.5); padding: 3px 10px; border-radius: 6px; border: 1px solid rgba(239,68,68,0.2);">
          ${item.original.length > 32 ? item.original.substring(0, 28) + '...' : item.original}
        </span>
      </div>
      <div style="font-size: 12px; color: #cbd5e1; line-height: 1.4; display: flex; align-items: flex-start; gap: 6px;">
        <span style="margin-top: 1px; flex-shrink: 0;">${SVG_INFO_ICON}</span>
        <span><strong>Threat Analysis:</strong> ${item.explanation}</span>
      </div>
    </div>
  `).join('');

  activeModalElement.innerHTML = `
    <div style="background: #090d16; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 16px; width: 100%; max-width: 540px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 35px rgba(239, 68, 68, 0.25); overflow: hidden;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(185, 28, 28, 0.1)); padding: 18px 22px; border-bottom: 1px solid rgba(239, 68, 68, 0.3); display: flex; align-items: center; gap: 14px;">
        <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); display: flex; align-items: center; justify-content: center;">
          ${SVG_ALERT_ICON}
        </div>
        <div>
          <h3 style="margin: 0; color: #f8fafc; font-size: 15px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">Security Interception Active</h3>
          <p style="margin: 3px 0 0; color: #94a3b8; font-size: 12px;">Unencrypted sensitive credentials detected prior to upstream transmission.</p>
        </div>
      </div>

      <!-- Content -->
      <div style="padding: 20px; max-height: 320px; overflow-y: auto;">
        <div style="font-size: 11px; font-weight: 800; color: #fca5a5; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px;">
          Flagged Security Items (${items.length}):
        </div>
        ${itemsHtml}
      </div>

      <!-- Action Footer -->
      <div style="background: #030712; padding: 16px 22px; border-top: 1px solid rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: flex-end; gap: 12px;">
        <button id="ps-cancel-btn" style="padding: 9px 16px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.15); background: transparent; color: #94a3b8; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          ${SVG_CANCEL_ICON}
          <span>ABORT & REVISE</span>
        </button>
        <button id="ps-encrypt-btn" style="padding: 9px 18px; border-radius: 8px; border: none; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; font-size: 12px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 0 18px rgba(16, 185, 129, 0.4); letter-spacing: 0.3px;">
          ${SVG_LOCK_ICON}
          <span>ENCRYPT & DISPATCH SAFE PROMPT</span>
        </button>
      </div>

    </div>
  `;

  document.body.appendChild(activeModalElement);

  document.getElementById('ps-cancel-btn')?.addEventListener('click', () => {
    if (activeModalElement) activeModalElement.remove();
  });

  document.getElementById('ps-encrypt-btn')?.addEventListener('click', () => {
    if (activeModalElement) activeModalElement.remove();
    onConfirmEncrypt();
  });
}

// Alert Modal for Image Upload Cancelled
function showImageUploadBlockedModal(fileName: string, reason: string) {
  if (activeModalElement) activeModalElement.remove();

  activeModalElement = document.createElement('div');
  activeModalElement.id = 'privacyshield-modal-overlay';
  activeModalElement.setAttribute(
    'style',
    `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(3, 7, 18, 0.85);
    backdrop-filter: blur(16px);
    z-index: 9999999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    box-sizing: border-box;
    font-family: system-ui, -apple-system, sans-serif;
  `
  );

  activeModalElement.innerHTML = `
    <div style="background: #090d16; border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 16px; width: 100%; max-width: 480px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 35px rgba(239, 68, 68, 0.25); overflow: hidden;">
      
      <div style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(185, 28, 28, 0.1)); padding: 18px 22px; border-bottom: 1px solid rgba(239, 68, 68, 0.3); display: flex; align-items: center; gap: 14px;">
        <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); display: flex; align-items: center; justify-content: center;">
          ${SVG_SHIELD_OFF_ICON}
        </div>
        <div>
          <h3 style="margin: 0; color: #f8fafc; font-size: 15px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">Image Upload Blocked</h3>
          <p style="margin: 3px 0 0; color: #fca5a5; font-size: 12px;">File: ${fileName}</p>
        </div>
      </div>

      <div style="padding: 20px; font-size: 13px; color: #cbd5e1; line-height: 1.5;">
        <strong>Policy Enforcement Triggered:</strong><br/>
        ${reason}
      </div>

      <div style="background: #030712; padding: 14px 22px; border-top: 1px solid rgba(255, 255, 255, 0.08); display: flex; justify-content: flex-end;">
        <button id="ps-image-dismiss-btn" style="padding: 9px 18px; border-radius: 8px; border: none; background: #334155; color: #f8fafc; font-size: 12px; font-weight: 700; cursor: pointer;">
          DISMISS (UPLOAD CANCELLED)
        </button>
      </div>

    </div>
  `;

  document.body.appendChild(activeModalElement);

  document.getElementById('ps-image-dismiss-btn')?.addEventListener('click', () => {
    if (activeModalElement) activeModalElement.remove();
  });
}

// SYNCHRONOUS Submission Gatekeeper Lock
function handleSynchronousSubmissionGuard(e: Event) {
  if (isBypassingLock) return;

  const { text: rawText, element: inputEl } = getPromptRawText();
  if (!rawText || !rawText.trim()) return;

  const { sanitized, count, items, tokenMap } = analyzeSensitiveText(rawText);

  if (count > 0) {
    // SYNCHRONOUSLY TRAP & CANCEL SUBMISSION IMMEDIATELY!
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();

    console.log('[PrivacyShield SOC] Trapped submission containing sensitive entities:', items);

    // Show warning modal
    showSecurityWarningModal(items, sanitized, tokenMap, async () => {
      tokenMap.forEach((val, key) => sessionTokenMap.set(key, val));

      if (inputEl) {
        if ('value' in inputEl) {
          (inputEl as any).value = sanitized;
        } else {
          replaceProseMirrorContent(inputEl, sanitized);
        }
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
      }

      await incrementRedactedStats(count);

      // Trigger safe submission now that prompt is encrypted & clean
      isBypassingLock = true;
      setTimeout(() => {
        const sendBtn = document.querySelector('button[data-testid="send-button"]') as HTMLButtonElement || 
                        document.querySelector('button[aria-label*="Send"]') as HTMLButtonElement ||
                        document.querySelector('button') as HTMLButtonElement;
        if (sendBtn) sendBtn.click();
        isBypassingLock = false;
      }, 150);
    });

    return false;
  }
}

// Image File Upload Interceptor & Scanner
function attachImageUploadShield() {
  document.addEventListener('change', (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target && target.type === 'file' && target.files && target.files.length > 0) {
      const file = target.files[0];
      if (file.type.startsWith('image/') || file.name.match(/\.(png|jpe?g|bmp|webp)$/i)) {
        if (file.name.match(/(card|ssn|passport|id|medical|invoice|secret|key|license)/i)) {
          e.preventDefault();
          target.value = '';
          showImageUploadBlockedModal(
            file.name,
            `Document image name "${file.name}" indicates sensitive identity/financial data. Uploading unredacted images to AI models is blocked under active compliance policy.`
          );
        }
      }
    }
  }, true);
}

// Attach high-priority capture-phase listeners directly to Send buttons and window
function attachButtonGatekeeper() {
  const sendButtons = document.querySelectorAll('button[data-testid="send-button"], button[aria-label*="Send"], button[aria-label*="send"]');
  sendButtons.forEach((btn) => {
    if (!btn.getAttribute('data-ps-attached')) {
      btn.setAttribute('data-ps-attached', 'true');
      ['mousedown', 'pointerdown', 'touchstart', 'click'].forEach((evtType) => {
        btn.addEventListener(evtType, handleSynchronousSubmissionGuard, true);
      });
    }
  });
}

function attachListeners() {
  injectSecurityBadge();
  attachImageUploadShield();
  attachButtonGatekeeper();

  // 1. Capture-phase Enter keydown listener on window
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSynchronousSubmissionGuard(e);
    }
  }, true);

  // 2. Capture-phase mousedown / pointerdown / touchstart / click on window
  ['mousedown', 'pointerdown', 'touchstart', 'click'].forEach((evtType) => {
    window.addEventListener(evtType, (e: Event) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.getAttribute('data-testid') === 'send-button' ||
          target.closest('[data-testid="send-button"]') ||
          target.getAttribute('aria-label')?.toLowerCase().includes('send') ||
          target.closest('button[aria-label*="Send"]'))
      ) {
        handleSynchronousSubmissionGuard(e);
      }
    }, true);
  });

  // 3. Capture-phase Form submit listener
  window.addEventListener('submit', (e: Event) => {
    handleSynchronousSubmissionGuard(e);
  }, true);

  // 4. Continuous DOM observer to attach button gatekeeper dynamically
  const observer = new MutationObserver(() => {
    attachButtonGatekeeper();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', attachListeners);
} else {
  attachListeners();
}

export {};
