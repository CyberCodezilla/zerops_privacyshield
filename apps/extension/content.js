/**
 * Privacy Shield — Universal AI Privacy Guard Content Script
 * Supports ChatGPT, Claude, Gemini, Perplexity, DeepSeek, and custom AI UIs.
 */

(function () {
  'use strict';

  // Default Settings
  let config = {
    enabled: true,
    apiUrl: 'https://app-2c3d-3000.prg1.zerops.app',
    selectedLanguage: 'auto',
    autoRedactOnPaste: true,
    autoRedactOnSubmit: true
  };

  // Load extension storage settings if available
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(config, (items) => {
      config = { ...config, ...items };
      initShield();
    });
  } else {
    initShield();
  }

  // Universal Selectors for AI Chat Inputs across all platforms
  const AI_INPUT_SELECTORS = [
    // ChatGPT
    '#prompt-textarea',
    'div[contenteditable="true"][data-id]',
    'textarea[tabindex="0"]',
    
    // Claude.ai
    'div.ProseMirror[contenteditable="true"]',
    'div[contenteditable="true"]',
    
    // Gemini
    'rich-textarea div[contenteditable="true"]',
    'div.textarea[contenteditable="true"]',
    
    // Perplexity AI
    'textarea[placeholder*="Ask"]',
    'textarea[placeholder*="Search"]',
    
    // DeepSeek
    'textarea#chat-input',
    
    // Generic AI Chat UIs
    'textarea',
    'div[contenteditable="true"]'
  ];

  let shieldBadge = null;
  let redactionCount = 0;

  function initShield() {
    createFloatingBadge();
    observeDOM();
    attachInputListeners();
  }

  // Floating Security Badge on AI Web App UI
  function createFloatingBadge() {
    if (document.getElementById('privacy-shield-badge')) return;

    shieldBadge = document.createElement('div');
    shieldBadge.id = 'privacy-shield-badge';
    shieldBadge.className = 'ps-badge';
    shieldBadge.innerHTML = `
      <div class="ps-badge-content">
        <span class="ps-led"></span>
        <span class="ps-title">PRIVACY SHIELD ACTIVE</span>
        <span class="ps-count" id="ps-redact-count">0 REDACTED</span>
      </div>
    `;
    document.body.appendChild(shieldBadge);
  }

  function updateBadgeCount(count) {
    redactionCount += count;
    const countEl = document.getElementById('ps-redact-count');
    if (countEl) {
      countEl.textContent = `${redactionCount} REDACTED`;
      countEl.classList.add('ps-pulse');
      setTimeout(() => countEl.classList.remove('ps-pulse'), 1000);
    }
  }

  // Fast In-Memory Redaction Rules (Runs locally before network call)
  function redactTextLocally(text) {
    let sanitized = text || '';
    let count = 0;

    const rules = [
      { name: 'DATABASE_URI', pattern: /(?:jdbc:)?(?:postgresql|postgres|mysql|mongodb|redis|oracle):\/\/[a-zA-Z0-9_]+:[^@\s]+@[a-zA-Z0-9_.-]+:\d+\/[a-zA-Z0-9_.-]+/gi, label: '[DATABASE_URI_REDACTED]' },
      { name: 'AWS_ACCESS_KEY', pattern: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g, label: '[AWS_ACCESS_KEY_REDACTED]' },
      { name: 'AWS_SECRET_KEY', pattern: /(?:aws_secret_access_key|Secret Access Key|SecretKey)\s*[:=]\s*["']?([a-zA-Z0-9\/+]{40})["']?/gi, label: 'aws_secret_access_key: [AWS_SECRET_KEY_REDACTED]' },
      { name: 'GITHUB_TOKEN', pattern: /\b(ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,255}\b/g, label: '[GITHUB_TOKEN_REDACTED]' },
      { name: 'SLACK_WEBHOOK', pattern: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]+\/B[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+/g, label: '[SLACK_WEBHOOK_REDACTED]' },
      { name: 'GCP_API_KEY', pattern: /\bAIza[0-9A-Za-z-_]{35}\b/g, label: '[GCP_API_KEY_REDACTED]' },
      { name: 'STRIPE_KEY', pattern: /\b(sk|pk)_(test|live)_[0-9a-zA-Z]{24,99}\b/g, label: '[STRIPE_KEY_REDACTED]' },
      { name: 'BEARER_TOKEN', pattern: /Bearer\s+[a-zA-Z0-9_\-\.=]{20,}/gi, label: 'Bearer [TOKEN_REDACTED]' },
      { name: 'EMAIL', pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, label: '[EMAIL_REDACTED]' },
      { name: 'SSN', pattern: /\b\d{3}-\d{2}-\d{4}\b/g, label: '[SSN_REDACTED]' },
      { name: 'CREDIT_CARD', pattern: /\b(?:\d[ -]*?){13,19}\b/g, label: '[CREDIT_CARD_REDACTED]' },
      { name: 'PHONE', pattern: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, label: '[PHONE_REDACTED]' }
    ];

    rules.forEach((rule) => {
      sanitized = sanitized.replace(rule.pattern, () => {
        count++;
        return rule.label;
      });
    });

    return { sanitized, count };
  }

  // Get text from Input or Contenteditable element
  function getElementText(el) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      return el.value;
    }
    return el.innerText || el.textContent;
  }

  // Set text into Input or Contenteditable element
  function setElementText(el, newText) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      el.value = newText;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      el.innerText = newText;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // Attach event listeners to input elements
  function attachInputListeners() {
    AI_INPUT_SELECTORS.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        if (el.dataset.psAttached) return;
        el.dataset.psAttached = 'true';

        // Paste Event Interception
        el.addEventListener('paste', (e) => {
          if (!config.enabled || !config.autoRedactOnPaste) return;
          const pastedText = (e.clipboardData || window.clipboardData).getData('text');
          const { sanitized, count } = redactTextLocally(pastedText);

          if (count > 0) {
            e.preventDefault();
            const currentText = getElementText(el);
            setElementText(el, currentText + sanitized);
            updateBadgeCount(count);
          }
        });

        // Keydown Enter (Submit) Interception
        el.addEventListener('keydown', (e) => {
          if (!config.enabled || !config.autoRedactOnSubmit) return;
          if (e.key === 'Enter' && !e.shiftKey) {
            const text = getElementText(el);
            const { sanitized, count } = redactTextLocally(text);

            if (count > 0) {
              setElementText(el, sanitized);
              updateBadgeCount(count);
            }
          }
        });
      });
    });
  }

  // DOM Observer for Dynamic Single Page Apps (ChatGPT/Claude/Gemini/Perplexity re-renderings)
  function observeDOM() {
    const observer = new MutationObserver(() => {
      attachInputListeners();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
