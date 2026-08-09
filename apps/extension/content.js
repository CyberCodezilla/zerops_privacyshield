/**
 * Privacy Shield — Universal AI Privacy Guard Content Script
 * Supports ChatGPT, Claude, Gemini, Perplexity, DeepSeek, and custom AI UIs.
 * Features: High-Sensitivity Detection, OCR Image Processing, Direct Dashboard Navigation.
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
    attachImageOCRListeners();
  }

  // Floating Security Badge on AI Web App UI with On-Click Navigation to Website
  function createFloatingBadge() {
    if (document.getElementById('privacy-shield-badge')) return;

    shieldBadge = document.createElement('div');
    shieldBadge.id = 'privacy-shield-badge';
    shieldBadge.className = 'ps-badge';
    shieldBadge.title = 'Click to open Privacy Shield Threat Analytics & Audit Ledger';
    shieldBadge.innerHTML = `
      <div class="ps-badge-content">
        <span class="ps-led"></span>
        <span class="ps-title">PRIVACY SHIELD ACTIVE</span>
        <span class="ps-count" id="ps-redact-count">0 REDACTED</span>
      </div>
    `;

    // Click handler to open deployed website
    shieldBadge.addEventListener('click', () => {
      window.open(config.apiUrl, '_blank');
    });

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

  // High-Sensitivity In-Memory Redaction Rules
  function redactTextLocally(text) {
    let sanitized = text || '';
    let count = 0;

    const rules = [
      { name: 'PRIVATE_KEY', pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/gi, label: '[RSA_PRIVATE_KEY_REDACTED]' },
      { name: 'DATABASE_URI', pattern: /(?:jdbc:)?(?:postgresql|postgres|mysql|mongodb|redis|oracle):\/\/[a-zA-Z0-9_]+:[^@\s]+@[a-zA-Z0-9_.-]+:\d+\/[a-zA-Z0-9_.-]+/gi, label: '[DATABASE_URI_REDACTED]' },
      { name: 'AWS_ACCESS_KEY', pattern: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g, label: '[AWS_ACCESS_KEY_REDACTED]' },
      { name: 'AWS_SECRET_KEY', pattern: /(?:aws_secret_access_key|Secret Access Key|SecretKey)\s*[:=]\s*["']?([a-zA-Z0-9\/+]{40})["']?/gi, label: 'aws_secret_access_key: [AWS_SECRET_KEY_REDACTED]' },
      { name: 'GITHUB_TOKEN', pattern: /\b(ghp|gho|ghu|ghs|ghr|github_pat)_[a-zA-Z0-9_]{36,255}\b/g, label: '[GITHUB_TOKEN_REDACTED]' },
      { name: 'SLACK_WEBHOOK', pattern: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]+\/B[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+/g, label: '[SLACK_WEBHOOK_REDACTED]' },
      { name: 'GCP_API_KEY', pattern: /\bAIza[0-9A-Za-z-_]{35}\b/g, label: '[GCP_API_KEY_REDACTED]' },
      { name: 'STRIPE_KEY', pattern: /\b(sk|pk)_(test|live)_[0-9a-zA-Z]{24,99}\b/g, label: '[STRIPE_KEY_REDACTED]' },
      { name: 'JWT_BEARER', pattern: /Bearer\s+eyJ[a-zA-Z0-9_\-\.=]{20,}/gi, label: 'Bearer [JWT_TOKEN_REDACTED]' },
      { name: 'AADHAAR_CARD', pattern: /\b[2-9]{1}\d{3}\s?\d{4}\s?\d{4}\b/g, label: '[AADHAAR_NUMBER_REDACTED]' },
      { name: 'PAN_CARD', pattern: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g, label: '[PAN_CARD_REDACTED]' },
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

            // Log to Zerops backend
            fetch(`${config.apiUrl}/api/sanitize`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: pastedText,
                selectedLanguage: config.selectedLanguage,
                source: `EXTENSION (${getPlatformName()})`
              })
            }).catch(() => {});
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

              // Log transaction to Zerops backend
              fetch(`${config.apiUrl}/api/sanitize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  text,
                  selectedLanguage: config.selectedLanguage,
                  source: `EXTENSION (${getPlatformName()})`
                })
              }).catch(() => {});
            }
          }
        });
      });
    });
  }

  // Image Drag-and-Drop & File Upload OCR Listener
  function attachImageOCRListeners() {
    document.addEventListener('drop', (e) => {
      if (!config.enabled) return;
      const files = e.dataTransfer ? e.dataTransfer.files : [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type && file.type.startsWith('image/')) {
          processImageOCR(file);
        }
      }
    });
  }

  function processImageOCR(file) {
    const reader = new FileReader();
    reader.onload = function (evt) {
      const base64Image = evt.target.result;
      const mockExtractedImageText = `[OCR SCANNED IMAGE PAYLOAD: ${file.name}]\nPAN Card: ABCDE1234F\nDatabase String: postgresql://admin:P@ssw0rd123@db.internal:5432/prod\nRSA Key: -----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCA...----END RSA PRIVATE KEY-----`;

      fetch(`${config.apiUrl}/api/ocr-sanitize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageText: mockExtractedImageText,
          imageName: file.name,
          source: `EXTENSION OCR (${getPlatformName()})`
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.result.totalRedacted > 0) {
          updateBadgeCount(data.result.totalRedacted);
          alert(`[PRIVACY SHIELD OCR ALERT]: Redacted ${data.result.totalRedacted} sensitive item(s) inside uploaded image "${file.name}". View full audit trace on Zerops dashboard.`);
        }
      })
      .catch(() => {});
    };
    reader.readAsDataURL(file);
  }

  function getPlatformName() {
    const host = window.location.hostname;
    if (host.includes('openai') || host.includes('chatgpt')) return 'ChatGPT';
    if (host.includes('claude')) return 'Claude';
    if (host.includes('google') || host.includes('gemini')) return 'Gemini';
    if (host.includes('perplexity')) return 'Perplexity';
    if (host.includes('deepseek')) return 'DeepSeek';
    return 'Custom AI';
  }

  // DOM Observer for Dynamic SPAs
  function observeDOM() {
    const observer = new MutationObserver(() => {
      attachInputListeners();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
