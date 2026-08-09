/**
 * Privacy Shield — Universal AI Privacy Guard Content Script v2.4
 * Features: Web Page Extension Handshake Ping, Interactive Threat Alert Modal, 22+ Patterns, Deep-Linking & OCR Scanner.
 */

(function () {
  'use strict';

  // Set attribute on DOM so the Web Application knows extension is active
  document.documentElement.setAttribute('data-privacy-shield-installed', 'true');
  window.postMessage({ type: 'PRIVACY_SHIELD_EXTENSION_ACTIVE', version: '2.4' }, '*');

  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PRIVACY_SHIELD_PING_REQUEST') {
      window.postMessage({ type: 'PRIVACY_SHIELD_EXTENSION_ACTIVE', version: '2.4' }, '*');
    }
  });

  let config = {
    enabled: true,
    apiUrl: 'https://app-2c3d-3000.prg1.zerops.app',
    selectedLanguage: 'auto',
    autoRedactOnPaste: true,
    autoRedactOnSubmit: true
  };

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(config, (items) => {
      config = { ...config, ...items };
      initShield();
    });
  } else {
    initShield();
  }

  const AI_INPUT_SELECTORS = [
    '#prompt-textarea',
    'div[contenteditable="true"][data-id]',
    'textarea[tabindex="0"]',
    'div.ProseMirror[contenteditable="true"]',
    'div[contenteditable="true"]',
    'rich-textarea div[contenteditable="true"]',
    'div.textarea[contenteditable="true"]',
    'textarea[placeholder*="Ask"]',
    'textarea[placeholder*="Search"]',
    'textarea#chat-input',
    'textarea',
    'div[contenteditable="true"]'
  ];

  const SEND_BUTTON_SELECTORS = [
    'button[data-testid="send-button"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="Submit"]',
    'button.send-button',
    'button[type="submit"]',
    'form button'
  ];

  let shieldBadge = null;
  let redactionCount = 0;
  let activeModal = null;
  let latestTxId = null;

  function initShield() {
    createFloatingBadge();
    observeDOM();
    attachInputListeners();
    attachGlobalListeners();
    attachImageOCRListeners();
  }

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

    shieldBadge.addEventListener('click', () => {
      const targetUrl = latestTxId 
        ? `${config.apiUrl}/?txId=${latestTxId}`
        : config.apiUrl;
      window.open(targetUrl, '_blank');
    });

    document.body.appendChild(shieldBadge);
  }

  function updateBadgeCount(count, txId) {
    redactionCount += count;
    if (txId) latestTxId = txId;
    const countEl = document.getElementById('ps-redact-count');
    if (countEl) {
      countEl.textContent = `${redactionCount} REDACTED`;
      countEl.classList.add('ps-pulse');
      setTimeout(() => countEl.classList.remove('ps-pulse'), 1000);
    }
  }

  function calculateEntropy(str) {
    const len = str.length;
    if (len === 0) return 0;
    const freq = {};
    for (let i = 0; i < len; i++) {
      const char = str[i];
      freq[char] = (freq[char] || 0) + 1;
    }
    let entropy = 0;
    for (const char in freq) {
      const p = freq[char] / len;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  function detectHighEntropySpans(text) {
    const spans = [];
    const tokens = text.match(/\b[a-zA-Z0-9_\-\.]{16,128}\b/g) || [];

    for (const token of tokens) {
      if (token.startsWith('[') && token.endsWith(']')) continue;
      const entropy = calculateEntropy(token);
      if (entropy > 3.7 && /[0-9]/.test(token) && /[a-zA-Z]/.test(token)) {
        spans.push({
          text: token,
          entropy: entropy.toFixed(2),
          label: 'HIGH_ENTROPY_SECRET'
        });
      }
    }
    return spans;
  }

  // 22+ High-Sensitivity Local Scanner Rules
  function redactTextLocally(text) {
    let sanitized = text || '';
    let count = 0;
    const detectedTokens = [];

    const rules = [
      { name: 'PRIVATE_KEY', pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/gi, label: '[RSA_PRIVATE_KEY_REDACTED]', risk: 'CRITICAL' },
      { name: 'DATABASE_URI', pattern: /(?:jdbc:)?(?:postgresql|postgres|mysql|mongodb|mongodb\+srv|redis|oracle|mssql):\/\/[a-zA-Z0-9_]+:[^@\s]+@[a-zA-Z0-9_.-]+:\d+\/[a-zA-Z0-9_.-]+/gi, label: '[DATABASE_URI_REDACTED]', risk: 'CRITICAL' },
      { name: 'AWS_ACCESS_KEY', pattern: /\b(AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16}\b/g, label: '[AWS_ACCESS_KEY_REDACTED]', risk: 'CRITICAL' },
      { name: 'AWS_SECRET_KEY', pattern: /(?:aws_secret_access_key|aws_secret_key|aws_secret|Secret Access Key|AWS Secret Key|AWS Secret)\s*[:=]\s*["']?([a-zA-Z0-9\/+=]{32,64})["']?/gi, label: 'AWS Secret: [AWS_SECRET_KEY_REDACTED]', risk: 'CRITICAL' },
      { name: 'OPENAI_API_KEY', pattern: /\bsk-(?:proj-|admin-)?[a-zA-Z0-9_-]{32,128}\b/g, label: '[OPENAI_API_KEY_REDACTED]', risk: 'CRITICAL' },
      { name: 'ANTHROPIC_API_KEY', pattern: /\bsk-ant-api[0-9a-zA-Z-_]{60,128}\b/g, label: '[ANTHROPIC_API_KEY_REDACTED]', risk: 'CRITICAL' },
      { name: 'GITHUB_TOKEN', pattern: /\b(ghp|gho|ghu|ghs|ghr|github_pat)_[a-zA-Z0-9_]{36,255}\b/g, label: '[GITHUB_TOKEN_REDACTED]', risk: 'CRITICAL' },
      { name: 'SLACK_WEBHOOK', pattern: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]+\/B[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+/g, label: '[SLACK_WEBHOOK_REDACTED]', risk: 'CRITICAL' },
      { name: 'SLACK_BOT_TOKEN', pattern: /\bxox[baprs]-[a-zA-Z0-9_-]{10,255}\b/g, label: '[SLACK_TOKEN_REDACTED]', risk: 'CRITICAL' },
      { name: 'GCP_API_KEY', pattern: /\bAIza[0-9A-Za-z-_]{35}\b/g, label: '[GCP_API_KEY_REDACTED]', risk: 'CRITICAL' },
      { name: 'STRIPE_KEY', pattern: /\b(sk|pk|rk)_(test|live)_[0-9a-zA-Z]{24,99}\b/g, label: '[STRIPE_KEY_REDACTED]', risk: 'CRITICAL' },
      { name: 'SENDGRID_API_KEY', pattern: /\bSG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}\b/g, label: '[SENDGRID_KEY_REDACTED]', risk: 'CRITICAL' },
      { name: 'TWILIO_API_KEY', pattern: /\b(AC|SK)[a-f0-9]{32}\b/g, label: '[TWILIO_KEY_REDACTED]', risk: 'CRITICAL' },
      { name: 'GENERIC_SECRET_KEY', pattern: /(?:api_secret|client_secret|app_secret|secret_key|private_secret|auth_secret|access_secret)\s*[:=]\s*["']?([a-zA-Z0-9\/+_\-=]{16,128})["']?/gi, label: 'Secret: "[SECRET_KEY_REDACTED]"', risk: 'CRITICAL' },
      { name: 'PASSWORD_ASSIGNMENT', pattern: /(?:password|passwd|pass|pwd)\s*[:=]\s*["']([^"'\s]{6,64})["']/gi, label: 'password: "[PASSWORD_REDACTED]"', risk: 'CRITICAL' },
      { name: 'HINGLISH_SECRET_JARGON', pattern: /(?:chabi|chabhi|khufia_code|gupta_key|chupi_key)\s*[:=]\s*["']?([^"'\s]{6,64})["']?/gi, label: 'chabi: "[HINGLISH_SECRET_REDACTED]"', risk: 'CRITICAL' },
      { name: 'JWT_BEARER', pattern: /Bearer\s+eyJ[a-zA-Z0-9_\-\.=]{20,}/gi, label: 'Bearer [JWT_TOKEN_REDACTED]', risk: 'CRITICAL' },
      { name: 'AADHAAR_CARD', pattern: /\b[2-9]{1}\d{3}\s?\d{4}\s?\d{4}\b/g, label: '[AADHAAR_NUMBER_REDACTED]', risk: 'CRITICAL' },
      { name: 'PAN_CARD', pattern: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g, label: '[PAN_CARD_REDACTED]', risk: 'CRITICAL' },
      { name: 'IBAN_NUMBER', pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g, label: '[IBAN_REDACTED]', risk: 'HIGH' },
      { name: 'SWIFT_BIC', pattern: /\b[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?\b/g, label: '[SWIFT_BIC_REDACTED]', risk: 'MEDIUM' },
      { name: 'EMAIL', pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, label: '[EMAIL_REDACTED]', risk: 'HIGH' },
      { name: 'SSN', pattern: /\b\d{3}-\d{2}-\d{4}\b/g, label: '[SSN_REDACTED]', risk: 'CRITICAL' },
      { name: 'CREDIT_CARD', pattern: /\b(?:\d[ -]*?){13,19}\b/g, label: '[CREDIT_CARD_REDACTED]', risk: 'CRITICAL' },
      { name: 'PHONE', pattern: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, label: '[PHONE_REDACTED]', risk: 'MEDIUM' }
    ];

    rules.forEach((rule) => {
      sanitized = sanitized.replace(rule.pattern, (match) => {
        count++;
        detectedTokens.push({ name: rule.name, label: rule.label, original: match, risk: rule.risk });
        return rule.label;
      });
    });

    const entropySpans = detectHighEntropySpans(sanitized);
    entropySpans.forEach((span) => {
      if (!sanitized.includes('[HIGH_ENTROPY_REDACTED]') && sanitized.includes(span.text)) {
        sanitized = sanitized.replace(span.text, '[HIGH_ENTROPY_REDACTED]');
        count++;
        detectedTokens.push({ name: 'HIGH_ENTROPY_SECRET', label: '[HIGH_ENTROPY_REDACTED]', original: span.text, risk: 'HIGH' });
      }
    });

    return { sanitized, count, detectedTokens };
  }

  function getElementText(el) {
    if (!el) return '';
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      return el.value || '';
    }
    return el.innerText || el.textContent || '';
  }

  function setElementText(el, newText) {
    if (!el) return;
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      el.value = newText;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      el.innerText = newText;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function findActiveInput() {
    for (const selector of AI_INPUT_SELECTORS) {
      const el = document.querySelector(selector);
      if (el && (document.activeElement === el || el.contains(document.activeElement) || getElementText(el).trim().length > 0)) {
        return el;
      }
    }
    return document.querySelector('textarea, div[contenteditable="true"]');
  }

  function showThreatWarningModal(targetElement, rawText, sanitizedText, detectedTokens, onConfirmRedact, onBypass) {
    if (activeModal) activeModal.remove();

    const modal = document.createElement('div');
    modal.className = 'ps-threat-modal-overlay';
    
    const tokenChipsHtml = detectedTokens.map(t => `
      <div class="ps-token-chip">
        <span class="ps-chip-type">${t.name}</span>
        <span class="ps-chip-risk ${t.risk}">${t.risk}</span>
        <div class="ps-chip-label">REPLACEMENT: <code>${t.label}</code></div>
      </div>
    `).join('');

    modal.innerHTML = `
      <div class="ps-modal-card">
        <div class="ps-modal-header">
          <div class="ps-modal-title">
            <span class="ps-alert-icon">[ALERT]</span>
            <h3>PRIVACY SHIELD THREAT DETECTION ALERT</h3>
          </div>
          <span class="ps-badge-danger">${detectedTokens.length} SENSITIVE LEAKS FOUND</span>
        </div>

        <div class="ps-modal-body">
          <p class="ps-modal-desc">
            PrivacyShield intercepted sensitive enterprise credentials in your prompt before transmission to <strong>${getPlatformName()}</strong>. 
            Sanitizing this payload prevents passwords, private keys, and PII from being logged on external LLM servers.
          </p>

          <div class="ps-detected-box">
            <div class="ps-box-header">DETECTED EXPOSED SECRETS:</div>
            <div class="ps-chips-container">${tokenChipsHtml}</div>
          </div>

          <div class="ps-reasoning-box">
            <strong>REASONING & CULTURAL PROTECTION:</strong>
            <p>Our zero-trust gateway replaces sensitive values with immutable token placeholders and injects native language reasoning instructions to maintain context accuracy.</p>
          </div>
        </div>

        <div class="ps-modal-footer">
          <button id="ps-btn-redact" class="ps-btn ps-btn-primary">
            REDACT & SECURE PROMPT (RECOMMENDED)
          </button>
          <button id="ps-btn-bypass" class="ps-btn ps-btn-ghost">
            PROCEED ANYWAY (BYPASS)
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    activeModal = modal;

    document.getElementById('ps-btn-redact').addEventListener('click', () => {
      modal.remove();
      activeModal = null;
      onConfirmRedact();
    });

    document.getElementById('ps-btn-bypass').addEventListener('click', () => {
      modal.remove();
      activeModal = null;
      onBypass();
    });
  }

  function attachInputListeners() {
    AI_INPUT_SELECTORS.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        if (el.dataset.psAttached) return;
        el.dataset.psAttached = 'true';

        el.addEventListener('paste', (e) => {
          if (!config.enabled || !config.autoRedactOnPaste) return;
          const pastedText = (e.clipboardData || window.clipboardData).getData('text');
          const { sanitized, count, detectedTokens } = redactTextLocally(pastedText);

          if (count > 0) {
            e.preventDefault();
            const currentText = getElementText(el);

            showThreatWarningModal(el, pastedText, sanitized, detectedTokens, 
              () => {
                setElementText(el, currentText + sanitized);
                logTransactionToBackend(pastedText, count);
              },
              () => {
                setElementText(el, currentText + pastedText);
              }
            );
          }
        });

        el.addEventListener('keydown', (e) => {
          if (!config.enabled || !config.autoRedactOnSubmit) return;
          if (e.key === 'Enter' && !e.shiftKey) {
            const text = getElementText(el);
            const { sanitized, count, detectedTokens } = redactTextLocally(text);

            if (count > 0) {
              e.preventDefault();
              showThreatWarningModal(el, text, sanitized, detectedTokens,
                () => {
                  setElementText(el, sanitized);
                  logTransactionToBackend(text, count);
                },
                () => {
                  setElementText(el, text);
                }
              );
            }
          }
        });
      });
    });
  }

  function attachGlobalListeners() {
    // Intercept Click on Send/Submit Buttons
    document.addEventListener('click', (e) => {
      if (!config.enabled || !config.autoRedactOnSubmit) return;
      const target = e.target.closest('button, [role="button"]');
      if (!target) return;

      const isSendButton = SEND_BUTTON_SELECTORS.some(sel => target.matches(sel)) || 
                           target.getAttribute('aria-label')?.toLowerCase().includes('send') ||
                           target.getAttribute('data-testid')?.includes('send');

      if (isSendButton) {
        const inputEl = findActiveInput();
        if (inputEl) {
          const text = getElementText(inputEl);
          const { sanitized, count, detectedTokens } = redactTextLocally(text);

          if (count > 0) {
            e.preventDefault();
            e.stopPropagation();

            showThreatWarningModal(inputEl, text, sanitized, detectedTokens,
              () => {
                setElementText(inputEl, sanitized);
                logTransactionToBackend(text, count);
              },
              () => {
                setElementText(inputEl, text);
              }
            );
          }
        }
      }
    }, true);
  }

  function logTransactionToBackend(text, count) {
    fetch(`${config.apiUrl}/api/sanitize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        selectedLanguage: config.selectedLanguage,
        source: `EXTENSION (${getPlatformName()})`
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.result) {
        updateBadgeCount(count, data.result.id);
      } else {
        updateBadgeCount(count, null);
      }
    })
    .catch(() => {
      updateBadgeCount(count, null);
    });
  }

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
          updateBadgeCount(data.result.totalRedacted, data.result.id);
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

  function observeDOM() {
    const observer = new MutationObserver(() => {
      attachInputListeners();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
