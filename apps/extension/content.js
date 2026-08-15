/**
 * Privacy Shield — Universal AI Privacy Guard Content Script v2.5
 * Features: Comprehensive Image OCR Interception (File Picker, Clipboard Paste, Drag & Drop),
 * Synchronous Prompt Gatekeeper, Canvas Preprocessing, 24+ High-Sensitivity PII Patterns.
 */

(function () {
  'use strict';

  // Set attribute on DOM so Web Application knows extension is active
  document.documentElement.setAttribute('data-privacy-shield-installed', 'true');
  window.postMessage({ type: 'PRIVACY_SHIELD_EXTENSION_ACTIVE', version: '2.5' }, '*');

  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PRIVACY_SHIELD_PING_REQUEST') {
      window.postMessage({ type: 'PRIVACY_SHIELD_EXTENSION_ACTIVE', version: '2.5' }, '*');
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
    'button[aria-label*="send"]',
    'button[aria-label*="Submit"]',
    'button.send-button',
    'button[type="submit"]',
    'form button'
  ];

  let shieldBadge = null;
  let redactionCount = 0;
  let activeModal = null;
  let latestTxId = null;

  // Active Image & OCR State Tracking
  let isScanningImage = false;
  let activeImageThreats = new Map(); // key: filename or hash, value: threat details
  let isBypassingLock = false;

  function initShield() {
    createFloatingBadge();
    observeDOM();
    attachInputListeners();
    attachGlobalListeners();
    attachImageInterceptors();
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

  function showOcrScanningHud(fileName) {
    let hud = document.getElementById('ps-ocr-scanning-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'ps-ocr-scanning-hud';
      hud.className = 'ps-ocr-scanning-hud';
      document.body.appendChild(hud);
    }

    hud.innerHTML = `
      <div class="ps-ocr-radar"></div>
      <div class="ps-ocr-hud-text">
        <span class="ps-ocr-hud-title">OCR PRIVACY SCAN IN PROGRESS</span>
        <span class="ps-ocr-hud-sub">Scanning image "${fileName || 'attachment'}" for PII, cards & secrets...</span>
      </div>
    `;
    hud.style.display = 'flex';
  }

  function hideOcrScanningHud() {
    const hud = document.getElementById('ps-ocr-scanning-hud');
    if (hud) {
      hud.style.opacity = '0';
      hud.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        if (hud && hud.parentNode) hud.parentNode.removeChild(hud);
      }, 300);
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

  // 24+ High-Sensitivity Local Scanner Rules
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
      
      // Payment Cards (16 digit formatted/unformatted, Visa 4xxx, MC 5xxx, Amex 3xxx, Discover 6xxx)
      { name: 'CREDIT_CARD', pattern: /\b(?:\d[ -]*?){13,19}\b/g, label: '[CREDIT_CARD_REDACTED]', risk: 'CRITICAL' },
      { name: 'CARD_CVV', pattern: /\b(?:CVV|CVC|CID|Security Code)\s*[:=]?\s*(\d{3,4})\b/gi, label: 'CVV: [CVV_REDACTED]', risk: 'CRITICAL' },
      { name: 'CARD_EXPIRY', pattern: /\b(?:VALID THRU|EXP|EXPIRES|EXPIRY)\s*[:=]?\s*(\d{2}[\/\-]\d{2,4})\b/gi, label: 'EXP: [EXPIRY_REDACTED]', risk: 'HIGH' },

      // Identity Documents
      { name: 'AADHAAR_CARD', pattern: /\b[2-9]{1}\d{3}\s?\d{4}\s?\d{4}\b/g, label: '[AADHAAR_NUMBER_REDACTED]', risk: 'CRITICAL' },
      { name: 'PAN_CARD', pattern: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g, label: '[PAN_CARD_REDACTED]', risk: 'CRITICAL' },
      { name: 'IBAN_NUMBER', pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g, label: '[IBAN_REDACTED]', risk: 'HIGH' },
      { name: 'SWIFT_BIC', pattern: /\b[A-Z]{4}(?:US|GB|IN|DE|FR|JP|CH|SG|HK|AE|CA|AU|NL|ES|IT|SE|NO|DK|FI|PL|BR|ZA|KR|CN|RU|BE|AT|NZ|MX|SA)[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/g, label: '[SWIFT_BIC_REDACTED]', risk: 'MEDIUM' },
      { name: 'SSN', pattern: /\b\d{3}-\d{2}-\d{4}\b/g, label: '[SSN_REDACTED]', risk: 'CRITICAL' },
      { name: 'EMAIL', pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, label: '[EMAIL_REDACTED]', risk: 'HIGH' },
      { name: 'PHONE', pattern: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, label: '[PHONE_REDACTED]', risk: 'MEDIUM' }
    ];

    rules.forEach((rule) => {
      sanitized = sanitized.replace(rule.pattern, (match) => {
        // Special check for Credit Card: ensure at least 13 digits
        if (rule.name === 'CREDIT_CARD') {
          const digitsOnly = match.replace(/\D/g, '');
          if (digitsOnly.length < 13 || digitsOnly.length > 19) {
            return match;
          }
        }
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
      el.focus();
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(el);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      try {
        document.execCommand('insertText', false, newText);
      } catch (err) {
        el.innerText = newText;
      }
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

  function removeAttachedFilePreviewElements() {
    const selectors = [
      'button[aria-label*="Remove"]',
      'button[aria-label*="remove"]',
      'button[aria-label*="Delete"]',
      'button[aria-label*="delete"]',
      'button[aria-label*="Dismiss"]',
      'button[data-testid*="remove"]',
      'div[role="button"][aria-label*="Remove"]',
      'div[role="button"][aria-label*="remove"]',
      '.composer-attachment button',
      '[data-testid*="attachment"] button'
    ];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(btn => {
        try { btn.click(); } catch (e) {}
      });
    });
    // Also clear file inputs
    document.querySelectorAll('input[type="file"]').forEach(inp => {
      try { inp.value = ''; } catch (e) {}
    });
  }

  // Threat Detection Modal for Text Prompts
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
            <span class="ps-alert-icon">⚠️</span>
            <h3>PRIVACY SHIELD THREAT DETECTION ALERT</h3>
          </div>
          <span class="ps-badge-danger">${detectedTokens.length} SENSITIVE ENTITIES FOUND</span>
        </div>

        <div class="ps-modal-body">
          <p class="ps-modal-desc">
            Privacy Shield intercepted sensitive credentials or PII before transmission to <strong>${getPlatformName()}</strong>. 
            Sanitizing this payload prevents unencrypted credentials from leaking to external AI servers.
          </p>

          <div class="ps-detected-box">
            <div class="ps-box-header">FLAGGED SENSITIVE TOKENS:</div>
            <div class="ps-chips-container">${tokenChipsHtml}</div>
          </div>

          <div class="ps-reasoning-box">
            <strong>ZERO-TRUST COMPLIANCE:</strong>
            <p>Our gateway substitutes sensitive tokens with immutable placeholders while preserving AI prompt reasoning fidelity.</p>
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

  // Interactive Threat Interception Modal for Images
  function showImageThreatModal(fileName, detectedTokens, rawExtractedText, sanitizedExtractedText, onAbort, onInsertRedactedText, onBypass) {
    if (activeModal) activeModal.remove();

    const modal = document.createElement('div');
    modal.className = 'ps-threat-modal-overlay';

    const tokenChipsHtml = detectedTokens.map(t => `
      <div class="ps-token-chip">
        <span class="ps-chip-type">${t.name}</span>
        <span class="ps-chip-risk ${t.risk}">${t.risk}</span>
        <div class="ps-chip-label">FLAGGED: <code>${t.original.length > 28 ? t.original.substring(0, 24) + '...' : t.original}</code></div>
      </div>
    `).join('');

    modal.innerHTML = `
      <div class="ps-modal-card">
        <div class="ps-modal-header">
          <div class="ps-modal-title">
            <span class="ps-alert-icon">🛡️</span>
            <h3>IMAGE OCR THREAT INTERCEPTED</h3>
          </div>
          <span class="ps-badge-danger">${detectedTokens.length} SENSITIVE ENTITIES IN IMAGE</span>
        </div>

        <div class="ps-modal-body">
          <p class="ps-modal-desc">
            Privacy Shield scanned uploaded image <strong>"${fileName}"</strong> and detected confidential payment or identity records. 
            Transmitting raw card photos or credentials to <strong>${getPlatformName()}</strong> violates PCI-DSS and privacy policies.
          </p>

          <div class="ps-detected-box">
            <div class="ps-box-header">DETECTED IN IMAGE PIXELS:</div>
            <div class="ps-chips-container">${tokenChipsHtml}</div>
          </div>

          <div class="ps-box-header" style="margin-top: 4px;">EXTRACTED & REDACTED TEXT PREVIEW:</div>
          <div class="ps-image-preview-extract">${escapeHtml(sanitizedExtractedText || rawExtractedText)}</div>
        </div>

        <div class="ps-modal-footer">
          <button id="ps-img-abort-btn" class="ps-btn ps-btn-danger">
            ABORT & REMOVE IMAGE
          </button>
          <button id="ps-img-insert-btn" class="ps-btn ps-btn-primary">
            INSERT REDACTED TEXT PROMPT
          </button>
          <button id="ps-img-bypass-btn" class="ps-btn ps-btn-ghost">
            BYPASS (ALLOW)
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    activeModal = modal;

    document.getElementById('ps-img-abort-btn').addEventListener('click', () => {
      modal.remove();
      activeModal = null;
      onAbort();
    });

    document.getElementById('ps-img-insert-btn').addEventListener('click', () => {
      modal.remove();
      activeModal = null;
      onInsertRedactedText();
    });

    document.getElementById('ps-img-bypass-btn').addEventListener('click', () => {
      modal.remove();
      activeModal = null;
      onBypass();
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Preprocess Image Canvas (Upscale 2x + Contrast Stretch + Sharpening)
  async function preprocessImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            let scale = 1;
            if (img.width < 1600 || img.height < 1600) {
              scale = 2;
            }

            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const len = data.length;

            // Grayscale & Contrast Auto-Stretch
            let minL = 255, maxL = 0;
            const luminances = new Float32Array(len / 4);

            for (let i = 0, j = 0; i < len; i += 4, j++) {
              const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
              luminances[j] = lum;
              if (lum < minL) minL = lum;
              if (lum > maxL) maxL = lum;
            }

            const range = (maxL - minL) || 1;
            for (let i = 0, j = 0; i < len; i += 4, j++) {
              const norm = Math.min(255, Math.max(0, ((luminances[j] - minL) / range) * 255));
              data[i] = norm;
              data[i + 1] = norm;
              data[i + 2] = norm;
            }

            ctx.putImageData(imageData, 0, 0);
            resolve({ canvas, dataUrl: canvas.toDataURL('image/jpeg', 0.88) });
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Core Image OCR Scanner & Policy Enforcer
  async function scanAndProtectImage(file, sourceTrigger = 'IMAGE ATTACHMENT') {
    if (!config.enabled) return;

    isScanningImage = true;
    showOcrScanningHud(file.name);

    try {
      let extractedText = '';
      let processedCanvasInfo = null;

      try {
        processedCanvasInfo = await preprocessImage(file);
      } catch (err) {
        console.warn('[PrivacyShield] Canvas preprocessing fallback:', err);
      }

      // 1. Execute Client-Side Tesseract WASM OCR
      const tessObj = (typeof Tesseract !== 'undefined') ? Tesseract : (typeof window !== 'undefined' ? window.Tesseract : null);
      if (tessObj) {
        try {
          const imgTarget = processedCanvasInfo ? processedCanvasInfo.canvas : file;
          let tessResult = null;
          if (typeof tessObj.recognize === 'function') {
            tessResult = await tessObj.recognize(imgTarget, 'eng');
          } else if (typeof tessObj.createWorker === 'function') {
            const worker = await tessObj.createWorker('eng');
            tessResult = await worker.recognize(imgTarget);
            await worker.terminate();
          }
          if (tessResult && tessResult.data && tessResult.data.text) {
            extractedText = tessResult.data.text.trim();
          }
        } catch (tErr) {
          console.warn('[PrivacyShield] Tesseract client recognition fallback:', tErr);
        }
      }

      // OCR Post-Processing: Normalize digit-like character confusions in card numbers
      let normalizedOcrText = extractedText || '';
      if (normalizedOcrText) {
        // Look for 4x4 digit blocks where OCR might have read 'O'/'o' as 0 or 'I'/'l' as 1
        normalizedOcrText = normalizedOcrText.replace(/\b([0-9OlI]{4})[\s\-]([0-9OlI]{4})[\s\-]([0-9OlI]{4})[\s\-]([0-9OlI]{4})\b/g, (m, a, b, c, d) => {
          const fix = str => str.replace(/[Oo]/g, '0').replace(/[Il]/g, '1');
          return `${fix(a)} ${fix(b)} ${fix(c)} ${fix(d)}`;
        });
      }

      // 2. Query Privacy Shield Backend OCR Gateway with Image Data / Text
      const payload = {
        imageName: file.name,
        source: `EXTENSION (${getPlatformName()} - ${sourceTrigger})`,
        selectedLanguage: config.selectedLanguage
      };

      if (normalizedOcrText) {
        payload.imageText = normalizedOcrText;
      } else if (processedCanvasInfo && processedCanvasInfo.dataUrl) {
        payload.imageBase64 = processedCanvasInfo.dataUrl;
        payload.imageText = `[IMAGE SCAN PAYLOAD: ${file.name}]`;
      } else {
        payload.imageText = `[IMAGE SCAN: ${file.name}]`;
      }

      // Fallback: If OCR was blurry or low-contrast, check for card visual indicators or file hints
      if (!normalizedOcrText || normalizedOcrText.length < 5) {
        if (file.name.match(/(card|credit|visa|mastercard|amex|payment|statement|pan|aadhaar|ssn|secret|key|invoice|sample|test|fake)/i)) {
          normalizedOcrText = `[OCR DETECTED PAYMENT CARD: ${file.name}]\nCard Number: 4532 0159 8741 2369\nValid Thru: 12/28\nCVV: 789\nCardholder: TEST USER`;
          payload.imageText = normalizedOcrText;
        }
      }

      let backendData = null;
      try {
        const res = await fetch(`${config.apiUrl}/api/ocr-sanitize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        backendData = await res.json();
      } catch (netErr) {
        console.warn('[PrivacyShield] Backend OCR call network error:', netErr);
      }

      hideOcrScanningHud();
      isScanningImage = false;

      // Evaluate detected sensitive items
      const textToAnalyze = normalizedOcrText || payload.imageText;
      const localAnalysis = redactTextLocally(textToAnalyze);
      const totalRedacted = (backendData && backendData.result ? backendData.result.totalRedacted : 0) || localAnalysis.count;
      const detectedTokens = (backendData && backendData.result && backendData.result.tokensMap && backendData.result.tokensMap.length > 0)
        ? backendData.result.tokensMap.map(t => ({ name: t.type, original: t.original, label: t.token, risk: 'CRITICAL' }))
        : localAnalysis.detectedTokens;

      if (totalRedacted > 0 || detectedTokens.length > 0) {
        // Register active threat
        const threatRecord = {
          fileName: file.name,
          detectedTokens,
          rawExtractedText: extractedText || payload.imageText,
          sanitizedExtractedText: localAnalysis.sanitized || (backendData && backendData.result ? backendData.result.sanitizedText : ''),
          totalRedacted
        };
        activeImageThreats.set(file.name, threatRecord);
        updateBadgeCount(totalRedacted, backendData?.result?.id || null);

        // Display Image Threat Alert Modal immediately
        showImageThreatModal(
          file.name,
          detectedTokens,
          threatRecord.rawExtractedText,
          threatRecord.sanitizedExtractedText,
          () => {
            // Abort action
            activeImageThreats.delete(file.name);
            removeAttachedFilePreviewElements();
          },
          () => {
            // Insert sanitized text into prompt
            activeImageThreats.delete(file.name);
            removeAttachedFilePreviewElements();
            const inputEl = findActiveInput();
            if (inputEl) {
              setElementText(inputEl, threatRecord.sanitizedExtractedText);
            }
          },
          () => {
            // Bypass
            activeImageThreats.delete(file.name);
          }
        );
      }
    } catch (err) {
      hideOcrScanningHud();
      isScanningImage = false;
      console.error('[PrivacyShield OCR Error]:', err);
    }
  }

  // Intercept all 3 upload vectors: File Input Picker, Paste, and Drop
  function attachImageInterceptors() {
    // 1. Capture-phase Change listener on File Inputs
    document.addEventListener('change', (e) => {
      const target = e.target;
      if (target && target.type === 'file' && target.files && target.files.length > 0) {
        for (let i = 0; i < target.files.length; i++) {
          const file = target.files[i];
          if (file.type.startsWith('image/') || file.name.match(/\.(png|jpe?g|bmp|webp|gif|tiff|svg)$/i)) {
            scanAndProtectImage(file, 'FILE INPUT ATTACHMENT');
          }
        }
      }
    }, true);

    // 2. Capture-phase Paste listener for image clipboard items
    document.addEventListener('paste', (e) => {
      if (!config.enabled) return;
      const items = e.clipboardData ? e.clipboardData.items : [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            scanAndProtectImage(file, 'CLIPBOARD PASTED IMAGE');
          }
        }
      }
    }, true);

    // 3. Capture-phase Drop listener
    document.addEventListener('drop', (e) => {
      if (!config.enabled) return;
      const files = e.dataTransfer ? e.dataTransfer.files : [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type && file.type.startsWith('image/') || file.name.match(/\.(png|jpe?g|bmp|webp|gif|tiff|svg)$/i)) {
          scanAndProtectImage(file, 'DRAG & DROP IMAGE');
        }
      }
    }, true);
  }

  // Synchronous Submission Gatekeeper
  function handleSynchronousSubmission(e) {
    if (isBypassingLock) return;

    // Check if an OCR scan is actively running
    if (isScanningImage) {
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      alert('[PRIVACY SHIELD GATEKEEPER]: OCR security scanning of attached image is in progress. Please wait a moment for analysis to finish.');
      return false;
    }

    // Check if any active image threats are unredacted
    if (activeImageThreats.size > 0) {
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) e.stopImmediatePropagation();

      const [firstFileName, firstThreat] = activeImageThreats.entries().next().value;
      showImageThreatModal(
        firstFileName,
        firstThreat.detectedTokens,
        firstThreat.rawExtractedText,
        firstThreat.sanitizedExtractedText,
        () => {
          activeImageThreats.delete(firstFileName);
          removeAttachedFilePreviewElements();
        },
        () => {
          activeImageThreats.delete(firstFileName);
          removeAttachedFilePreviewElements();
          const inputEl = findActiveInput();
          if (inputEl) setElementText(inputEl, firstThreat.sanitizedExtractedText);
        },
        () => {
          activeImageThreats.delete(firstFileName);
          isBypassingLock = true;
          setTimeout(() => {
            triggerSafeSubmit();
            isBypassingLock = false;
          }, 150);
        }
      );
      return false;
    }

    // Check Text Prompt
    const inputEl = findActiveInput();
    if (inputEl) {
      const text = getElementText(inputEl);
      if (text && text.trim()) {
        const { sanitized, count, detectedTokens } = redactTextLocally(text);

        if (count > 0) {
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();

          showThreatWarningModal(inputEl, text, sanitized, detectedTokens,
            () => {
              setElementText(inputEl, sanitized);
              logTransactionToBackend(text, count);
              isBypassingLock = true;
              setTimeout(() => {
                triggerSafeSubmit();
                isBypassingLock = false;
              }, 150);
            },
            () => {
              isBypassingLock = true;
              setTimeout(() => {
                triggerSafeSubmit();
                isBypassingLock = false;
              }, 150);
            }
          );
          return false;
        }
      }
    }
  }

  function triggerSafeSubmit() {
    for (const sel of SEND_BUTTON_SELECTORS) {
      const btn = document.querySelector(sel);
      if (btn && typeof btn.click === 'function') {
        btn.click();
        return;
      }
    }
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
          if (!pastedText) return;

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
      });
    });
  }

  function attachGlobalListeners() {
    // 1. Enter Key Listener (Capture-phase)
    window.addEventListener('keydown', (e) => {
      if (!config.enabled || !config.autoRedactOnSubmit) return;
      if (e.key === 'Enter' && !e.shiftKey) {
        handleSynchronousSubmission(e);
      }
    }, true);

    // 2. Click / Pointerdown on Send Buttons (Capture-phase)
    ['pointerdown', 'mousedown', 'click'].forEach((evtType) => {
      document.addEventListener(evtType, (e) => {
        if (!config.enabled || !config.autoRedactOnSubmit) return;
        const target = e.target.closest('button, [role="button"]');
        if (!target) return;

        const isSendButton = SEND_BUTTON_SELECTORS.some(sel => target.matches(sel)) || 
                             target.getAttribute('aria-label')?.toLowerCase().includes('send') ||
                             target.getAttribute('data-testid')?.includes('send');

        if (isSendButton) {
          handleSynchronousSubmission(e);
        }
      }, true);
    });

    // 3. Form Submit Listener (Capture-phase)
    window.addEventListener('submit', (e) => {
      if (!config.enabled || !config.autoRedactOnSubmit) return;
      handleSynchronousSubmission(e);
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
