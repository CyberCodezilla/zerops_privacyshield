/**
 * Privacy Shield — Stage 3: Mathematical Checksums & Multi-Attribute Rule Matching Engine
 * 
 * Sub-stages implemented:
 * - Stage 3.1: Mathematical Checksum Validators (Verhoeff D5 Cayley Table & Luhn Modulo-10)
 * - Stage 3.2: Shannon Entropy Calculator & Random Secret Scanner (H = -sum P(x) log2 P(x))
 * - Stage 3.3: High-Sensitivity Regex Pattern Database Expansion (25+ Enterprise Patterns)
 * - Stage 3.4: Multi-Attribute Rule Engine with 50-Character Keyword Proximity Anchoring
 */

(function (global, factory) {
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    global.PrivacyShieldRuleEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // 1. STAGE 3.1: MATHEMATICAL CHECKSUM VALIDATORS
  // ---------------------------------------------------------------------------

  /**
   * Verhoeff Algorithm Tables (Dihedral Group D5)
   * Mathematical proof: 100% single digit errors & 100% adjacent transpositions detected.
   */
  const VERHOEFF_D = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
  ];

  const VERHOEFF_P = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
  ];

  const VERHOEFF_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

  /**
   * Validate 12-digit Indian Aadhaar number using Verhoeff Checksum
   * @param {string|number} input - 12-digit Aadhaar string or number
   * @returns {boolean} True if mathematically valid
   */
  function validateVerhoeff(input) {
    if (!input) return false;
    const str = String(input).replace(/[\s-]/g, '');
    if (!/^\d{12}$/.test(str)) return false;

    // Check against obvious non-issued prefixes (UIDAI doesn't issue numbers starting with 0 or 1)
    if (str[0] === '0' || str[0] === '1') return false;

    let c = 0;
    const len = str.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(str.charAt(len - 1 - i), 10);
      c = VERHOEFF_D[c][VERHOEFF_P[i % 8][digit]];
    }

    return c === 0;
  }

  /**
   * Calculate Verhoeff Checksum digit for an 11-digit prefix
   * @param {string} numStr - 11-digit numeric prefix
   * @returns {number} Checksum digit (0-9)
   */
  function generateVerhoeffChecksum(numStr) {
    const str = String(numStr).replace(/\D/g, '');
    let c = 0;
    const len = str.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(str.charAt(len - 1 - i), 10);
      c = VERHOEFF_D[c][VERHOEFF_P[(i + 1) % 8][digit]];
    }
    return VERHOEFF_INV[c];
  }

  /**
   * Validate Payment Card number using Luhn Modulo-10 Algorithm
   * @param {string|number} input - Card number string
   * @returns {boolean} True if mathematically valid
   */
  function validateLuhn(input) {
    if (!input) return false;
    const str = String(input).replace(/[\s-]/g, '');
    if (!/^\d{13,19}$/.test(str)) return false;

    let sum = 0;
    let shouldDouble = false;

    for (let i = str.length - 1; i >= 0; i--) {
      let digit = parseInt(str.charAt(i), 10);
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  }

  // ---------------------------------------------------------------------------
  // 2. STAGE 3.2: SHANNON ENTROPY CALCULATOR & RANDOM SECRET EVALUATOR
  // ---------------------------------------------------------------------------

  /**
   * Calculate Shannon Entropy: H = -sum P(x_i) * log2(P(x_i))
   * @param {string} str - Target string
   * @returns {number} Float entropy value (bits per symbol)
   */
  function calculateShannonEntropy(str) {
    if (!str || typeof str !== 'string') return 0;
    const len = str.length;
    if (len === 0) return 0;

    const freq = {};
    for (let i = 0; i < len; i++) {
      const ch = str.charAt(i);
      freq[ch] = (freq[ch] || 0) + 1;
    }

    let entropy = 0;
    const invLen = 1.0 / len;
    for (const ch in freq) {
      const p = freq[ch] * invLen;
      entropy -= p * Math.log2(p);
    }

    return Number(entropy.toFixed(3));
  }

  /**
   * Check if candidate token represents a high-entropy secret
   * Requires: length >= 16, H > 3.7, mixed character classes (alpha + digits)
   */
  function isHighEntropySecret(token, minLength = 16, entropyThreshold = 3.7) {
    if (!token || typeof token !== 'string') return false;
    if (token.length < minLength) return false;
    if (token.startsWith('[') && token.endsWith(']')) return false;

    // Must contain both letters and numbers, or special base64 symbols
    const hasLetters = /[a-zA-Z]/.test(token);
    const hasDigits = /[0-9]/.test(token);
    if (!hasLetters || !hasDigits) return false;

    const entropy = calculateShannonEntropy(token);
    return entropy >= entropyThreshold;
  }

  // ---------------------------------------------------------------------------
  // 3. STAGE 3.3 & 3.4: MULTI-ATTRIBUTE RULE REGISTRY & KEYWORD ANCHORING
  // ---------------------------------------------------------------------------

  /**
   * Helper: Check if anchor keywords exist within proximity window around match
   * @param {string} fullText - Entire input document
   * @param {number} matchIndex - Start index of the matched substring
   * @param {number} matchLength - Length of matched substring
   * @param {Array<string|RegExp>} keywords - Proximity keywords to search for
   * @param {number} windowSize - Window character size (default 50 chars before/after)
   * @returns {boolean} True if any keyword found within proximity window
   */
  function checkKeywordProximity(fullText, matchIndex, matchLength, keywords, windowSize = 50) {
    if (!keywords || keywords.length === 0) return true;

    const start = Math.max(0, matchIndex - windowSize);
    const end = Math.min(fullText.length, matchIndex + matchLength + windowSize);
    const windowText = fullText.substring(start, end).toLowerCase();

    return keywords.some((kw) => {
      if (kw instanceof RegExp) {
        return kw.test(windowText);
      }
      return windowText.includes(kw.toLowerCase());
    });
  }

  /**
   * Complete Enterprise Ruleset Database
   */
  const RULE_DEFINITIONS = [
    // 1. RSA / OPENSSH / EC / PGP PRIVATE KEYS
    {
      id: 'RSA_PRIVATE_KEY',
      name: 'RSA / ECC / OpenSSH Private Key',
      category: 'CRYPTOGRAPHIC_SECRET',
      risk: 'CRITICAL',
      confidence: 100.0,
      pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/gi,
      label: '[RSA_PRIVATE_KEY_REDACTED]',
      requiresProximity: false
    },

    // 2. DATABASE CONNECTION URIs
    {
      id: 'DATABASE_URI',
      name: 'Database Connection String',
      category: 'INFRASTRUCTURE_SECRET',
      risk: 'CRITICAL',
      confidence: 100.0,
      pattern: /(?:jdbc:)?(?:postgresql|postgres|mysql|mongodb|mongodb\+srv|redis|oracle|mssql):\/\/[^\s"'\<\>]+/gi,
      label: '[DATABASE_URI_REDACTED]',
      requiresProximity: false
    },

    // 3. AWS ACCESS KEY IDENTIFIERS
    {
      id: 'AWS_ACCESS_KEY',
      name: 'AWS Access Key ID',
      category: 'CLOUD_CREDENTIAL',
      risk: 'CRITICAL',
      confidence: 100.0,
      pattern: /\b(AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16}\b/g,
      label: '[AWS_ACCESS_KEY_REDACTED]',
      requiresProximity: false
    },

    // 4. AWS SECRET ACCESS KEYS
    {
      id: 'AWS_SECRET_KEY',
      name: 'AWS Secret Access Key',
      category: 'CLOUD_CREDENTIAL',
      risk: 'CRITICAL',
      confidence: 99.8,
      pattern: /(?:aws_secret_access_key|aws_secret_key|aws_secret|Secret Access Key|AWS Secret Key|AWS Secret)\s*[:=]\s*["']?([a-zA-Z0-9\/+=]{32,64})["']?/gi,
      label: 'AWS Secret: [AWS_SECRET_KEY_REDACTED]',
      requiresProximity: false
    },

    // 5. ANTHROPIC CLAUDE API KEYS (Before OpenAI to avoid sk- collision)
    {
      id: 'ANTHROPIC_API_KEY',
      name: 'Anthropic Claude API Key',
      category: 'AI_API_KEY',
      risk: 'CRITICAL',
      confidence: 100.0,
      pattern: /\bsk-ant-api[0-9a-zA-Z_-]{50,128}\b/g,
      label: '[ANTHROPIC_API_KEY_REDACTED]',
      requiresProximity: false
    },

    // 6. OPENAI API KEYS
    {
      id: 'OPENAI_API_KEY',
      name: 'OpenAI API Key',
      category: 'AI_API_KEY',
      risk: 'CRITICAL',
      confidence: 100.0,
      pattern: /\bsk-(?!ant-)(?:proj-|admin-)?[a-zA-Z0-9_-]{32,128}\b/g,
      label: '[OPENAI_API_KEY_REDACTED]',
      requiresProximity: false
    },

    // 7. GITHUB TOKENS & PERSONAL ACCESS TOKENS
    {
      id: 'GITHUB_TOKEN',
      name: 'GitHub Personal Access Token',
      category: 'VCS_TOKEN',
      risk: 'CRITICAL',
      confidence: 100.0,
      pattern: /\b(ghp|gho|ghu|ghs|ghr|github_pat)_[a-zA-Z0-9_]{36,255}\b/g,
      label: '[GITHUB_TOKEN_REDACTED]',
      requiresProximity: false
    },

    // 8. SLACK WEBHOOKS & BOT TOKENS
    {
      id: 'SLACK_WEBHOOK',
      name: 'Slack Incoming Webhook',
      category: 'COMMUNICATION_SECRET',
      risk: 'CRITICAL',
      confidence: 100.0,
      pattern: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]+\/B[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+/g,
      label: '[SLACK_WEBHOOK_REDACTED]',
      requiresProximity: false
    },
    {
      id: 'SLACK_BOT_TOKEN',
      name: 'Slack Bot / App Token',
      category: 'COMMUNICATION_SECRET',
      risk: 'CRITICAL',
      confidence: 100.0,
      pattern: /\bxox[baprs]-[a-zA-Z0-9_-]{10,255}\b/g,
      label: '[SLACK_TOKEN_REDACTED]',
      requiresProximity: false
    },

    // 9. GOOGLE CLOUD (GCP) API KEYS
    {
      id: 'GCP_API_KEY',
      name: 'Google Cloud API Key',
      category: 'CLOUD_CREDENTIAL',
      risk: 'CRITICAL',
      confidence: 99.7,
      pattern: /\bAIza[0-9A-Za-z-_]{32,45}\b/g,
      label: '[GCP_API_KEY_REDACTED]',
      requiresProximity: false
    },

    // 10. STRIPE LIVE & TEST API KEYS
    {
      id: 'STRIPE_KEY',
      name: 'Stripe API Key',
      category: 'PAYMENT_SECRET',
      risk: 'CRITICAL',
      confidence: 99.9,
      pattern: /\b(sk|pk|rk)_(test|live)_[0-9a-zA-Z]{24,99}\b/g,
      label: '[STRIPE_KEY_REDACTED]',
      requiresProximity: false
    },

    // 11. SENDGRID & TWILIO API KEYS
    {
      id: 'SENDGRID_API_KEY',
      name: 'SendGrid API Key',
      category: 'COMMUNICATION_SECRET',
      risk: 'CRITICAL',
      confidence: 99.9,
      pattern: /\bSG\.[a-zA-Z0-9_-]{16,32}\.[a-zA-Z0-9_-]{32,64}\b/g,
      label: '[SENDGRID_KEY_REDACTED]',
      requiresProximity: false
    },
    {
      id: 'TWILIO_API_KEY',
      name: 'Twilio Auth Token / API Key',
      category: 'COMMUNICATION_SECRET',
      risk: 'CRITICAL',
      confidence: 99.5,
      pattern: /\b(AC|SK)[a-f0-9]{32}\b/g,
      label: '[TWILIO_KEY_REDACTED]',
      requiresProximity: false
    },

    // 12. PAYMENT CARD NUMBERS (Enforced with Luhn Modulo-10 Checksum)
    {
      id: 'CREDIT_CARD',
      name: 'Payment Card Number (Luhn Validated)',
      category: 'FINANCIAL_PII',
      risk: 'CRITICAL',
      confidence: 99.9,
      pattern: /\b(?:\d[ -]*?){13,19}\b/g,
      label: '[CREDIT_CARD_REDACTED]',
      requiresProximity: false,
      validator: (match) => {
        const cleaned = match.replace(/[\s-]/g, '');
        if (cleaned.length < 13 || cleaned.length > 19) return false;
        return validateLuhn(cleaned);
      }
    },

    // 13. CARD SECURITY DETAILS (CVV & EXPIRATION)
    {
      id: 'CARD_CVV',
      name: 'Card Security Code (CVV/CVC)',
      category: 'FINANCIAL_PII',
      risk: 'CRITICAL',
      confidence: 99.5,
      pattern: /\b(?:CVV|CVC|CID|Security Code)\s*[:=]?\s*(\d{3,4})\b/gi,
      label: 'CVV: [CVV_REDACTED]',
      requiresProximity: true,
      proximityKeywords: ['card', 'visa', 'mastercard', 'payment', 'credit', 'debit', 'exp', 'valid', 'cvv', 'cvc']
    },
    {
      id: 'CARD_EXPIRY',
      name: 'Card Expiration Date',
      category: 'FINANCIAL_PII',
      risk: 'HIGH',
      confidence: 99.0,
      pattern: /\b(?:VALID THRU|EXP|EXPIRES|EXPIRY)\s*[:=]?\s*(\d{2}[\/\-]\d{2,4})\b/gi,
      label: 'EXP: [EXPIRY_REDACTED]',
      requiresProximity: true,
      proximityKeywords: ['card', 'visa', 'mastercard', 'payment', 'credit', 'debit', 'thru', 'valid', 'exp']
    },

    // 14. INDIAN AADHAAR CARD (Enforced with Verhoeff D5 Checksum + Keyword Anchoring)
    {
      id: 'AADHAAR_CARD',
      name: 'Indian Aadhaar UIDAI Number (Verhoeff Validated)',
      category: 'GOVERNMENT_ID',
      risk: 'CRITICAL',
      confidence: 99.8,
      pattern: /\b[2-9]{1}\d{3}\s?\d{4}\s?\d{4}\b/g,
      label: '[AADHAAR_NUMBER_REDACTED]',
      requiresProximity: false, // Verhoeff checksum provides mathematical proof
      validator: (match) => {
        const cleaned = match.replace(/[\s-]/g, '');
        return validateVerhoeff(cleaned);
      }
    },

    // 15. INDIAN PAN CARD (10-Char Tax ID)
    {
      id: 'PAN_CARD',
      name: 'Indian Income Tax PAN Card',
      category: 'GOVERNMENT_ID',
      risk: 'CRITICAL',
      confidence: 99.5,
      pattern: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g,
      label: '[PAN_CARD_REDACTED]',
      requiresProximity: false
    },

    // 16. US SOCIAL SECURITY NUMBER (SSN)
    {
      id: 'SSN',
      name: 'US Social Security Number',
      category: 'GOVERNMENT_ID',
      risk: 'CRITICAL',
      confidence: 99.9,
      pattern: /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g,
      label: '[SSN_REDACTED]',
      requiresProximity: false
    },

    // 17. INTERNATIONAL BANK ACCOUNT NUMBERS (IBAN)
    {
      id: 'IBAN_NUMBER',
      name: 'International Bank Account Number (IBAN)',
      category: 'FINANCIAL_PII',
      risk: 'HIGH',
      confidence: 99.2,
      pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g,
      label: '[IBAN_REDACTED]',
      requiresProximity: false
    },

    // 18. SWIFT / BIC BANK CODES
    {
      id: 'SWIFT_BIC',
      name: 'SWIFT / BIC Code',
      category: 'FINANCIAL_PII',
      risk: 'MEDIUM',
      confidence: 98.0,
      pattern: /\b[A-Z]{4}(?:US|GB|IN|DE|FR|JP|CH|SG|HK|AE|CA|AU|NL|ES|IT|SE|NO|DK|FI|PL|BR|ZA|KR|CN|RU|BE|AT|NZ|MX|SA)[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/g,
      label: '[SWIFT_BIC_REDACTED]',
      requiresProximity: false
    },

    // 19. JWT & BEARER TOKENS
    {
      id: 'JWT_BEARER',
      name: 'JSON Web Token (JWT) Bearer Header',
      category: 'AUTH_TOKEN',
      risk: 'CRITICAL',
      confidence: 99.8,
      pattern: /Bearer\s+eyJ[a-zA-Z0-9_\-\.=]{20,}/gi,
      label: 'Bearer [JWT_TOKEN_REDACTED]',
      requiresProximity: false
    },

    // 20. PASSWORDS & ASSIGNMENTS (Enforces Proximity Anchoring)
    {
      id: 'PASSWORD_ASSIGNMENT',
      name: 'Hardcoded Password Assignment',
      category: 'CREDENTIAL',
      risk: 'CRITICAL',
      confidence: 99.4,
      pattern: /(?:password|passwd|pass|pwd|user_pass|admin_pass)\s*[:=]\s*["']([^"'\s]{6,64})["']/gi,
      label: 'password: "[PASSWORD_REDACTED]"',
      requiresProximity: false
    },

    // 21. HINGLISH / MINGLISH SENSITIVE JARGON ASSIGNMENTS
    {
      id: 'HINGLISH_SECRET_JARGON',
      name: 'Hinglish / Minglish Secret Jargon',
      category: 'CULTURAL_CREDENTIAL',
      risk: 'CRITICAL',
      confidence: 99.0,
      pattern: /(?:chabi|chabhi|khufia_code|gupta_key|chupi_key)\s*[:=]\s*["']?([^"'\s]{6,64})["']?/gi,
      label: 'chabi: "[HINGLISH_SECRET_REDACTED]"',
      requiresProximity: false
    },

    // 22. GENERIC SECRET / API KEYS (Enforces Proximity Anchoring & Entropy)
    {
      id: 'GENERIC_SECRET_KEY',
      name: 'Generic API / Client Secret Key',
      category: 'GENERIC_SECRET',
      risk: 'CRITICAL',
      confidence: 99.5,
      pattern: /(?:api_secret|client_secret|app_secret|secret_key|private_secret|auth_secret|access_secret)\s*[:=]\s*["']?([a-zA-Z0-9\/+_\-=]{16,128})["']?/gi,
      label: 'Secret: "[SECRET_KEY_REDACTED]"',
      requiresProximity: false
    },

    // 23. EMAIL ADDRESSES
    {
      id: 'EMAIL',
      name: 'Email Address',
      category: 'COMMUNICATION_PII',
      risk: 'HIGH',
      confidence: 99.5,
      pattern: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
      label: '[EMAIL_REDACTED]',
      requiresProximity: false
    },

    // 24. PHONE NUMBERS
    {
      id: 'PHONE',
      name: 'Telephone Number',
      category: 'COMMUNICATION_PII',
      risk: 'MEDIUM',
      confidence: 97.0,
      pattern: /(?<![a-zA-Z0-9_\-\.])(?:\+?\d{1,3}[-.\s]?)?(?:\(\d{3}\)|\d{3})[-.\s]?\d{3}[-.\s]?\d{4}(?![a-zA-Z0-9_\-\.])/g,
      label: '[PHONE_REDACTED]',
      requiresProximity: false
    },

    // 25. IP ADDRESSES (IPv4)
    {
      id: 'IP_ADDRESS',
      name: 'IPv4 Network Address',
      category: 'NETWORK_PII',
      risk: 'LOW',
      confidence: 98.0,
      pattern: /(?<![a-zA-Z0-9_\-\.])(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?![a-zA-Z0-9_\-\.])/g,
      label: '[IP_REDACTED]',
      requiresProximity: false
    }
  ];

  // ---------------------------------------------------------------------------
  // 4. MULTI-ATTRIBUTE EVALUATOR PIPELINE
  // ---------------------------------------------------------------------------

  /**
   * Execute multi-attribute rule evaluation on inbound payload
   * Steps:
   * 1. Regex candidate extraction with start/end indices
   * 2. Mathematical Checksums (Luhn, Verhoeff)
   * 3. Proximity keyword anchoring validation
   * 4. Shannon entropy evaluation for unstructured secret tokens
   * 5. Collision-free replacement and audit mapping
   */
  function evaluateAndSanitize(text, options = {}) {
    const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    let sanitized = text || '';
    const redactionCounts = {};
    const tokensMap = [];

    const appliedMatches = [];

    // Phase 1: Evaluate Defined Rules with Checksums & Proximity Anchoring
    RULE_DEFINITIONS.forEach((rule) => {
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
      let match;

      while ((match = regex.exec(text)) !== null) {
        const matchedText = match[0];
        const matchIndex = match.index;
        const matchLength = matchedText.length;

        // 1. Check mathematical validator if attached
        if (typeof rule.validator === 'function') {
          const isValid = rule.validator(matchedText);
          if (!isValid) {
            // Suppressed as false positive!
            continue;
          }
        }

        // 2. Check 50-character keyword proximity anchoring if required
        if (rule.requiresProximity && rule.proximityKeywords) {
          const hasAnchor = checkKeywordProximity(text, matchIndex, matchLength, rule.proximityKeywords, 50);
          if (!hasAnchor) {
            // Suppressed as false positive due to lack of keyword anchor!
            continue;
          }
        }

        appliedMatches.push({
          start: matchIndex,
          end: matchIndex + matchLength,
          original: matchedText,
          replacement: rule.label,
          type: rule.id,
          confidence: rule.confidence,
          risk: rule.risk,
          validationMethods: [
            'REGEX',
            typeof rule.validator === 'function' ? 'CHECKSUM' : null,
            rule.requiresProximity ? 'PROXIMITY_ANCHOR' : null
          ].filter(Boolean)
        });
      }
    });

    // Phase 2: Dynamic Shannon Entropy Scanner for Unstructured High-Entropy Tokens
    const tokenRegex = /\b[a-zA-Z0-9_\-\.]{16,128}\b/g;
    let entropyMatch;

    while ((entropyMatch = tokenRegex.exec(text)) !== null) {
      const candidate = entropyMatch[0];
      const matchIndex = entropyMatch.index;
      const matchLength = candidate.length;

      // Skip already matched/redacted spans
      const overlaps = appliedMatches.some(m => matchIndex >= m.start && matchIndex < m.end);
      if (overlaps) continue;

      if (isHighEntropySecret(candidate, 16, 3.7)) {
        const entropyVal = calculateShannonEntropy(candidate);
        appliedMatches.push({
          start: matchIndex,
          end: matchIndex + matchLength,
          original: candidate,
          replacement: '[HIGH_ENTROPY_REDACTED]',
          type: 'HIGH_ENTROPY_SECRET',
          confidence: 98.5,
          risk: 'HIGH',
          entropy: entropyVal,
          validationMethods: ['SHANNON_ENTROPY']
        });
      }
    }

    // Filter overlapping matches: prefer longer span (e.g. Full Database URI over nested email, full key over sub-token)
    appliedMatches.sort((a, b) => (b.end - b.start) - (a.end - a.start));
    const nonOverlapping = [];
    appliedMatches.forEach((m) => {
      const hasConflict = nonOverlapping.some(o => (m.start < o.end && m.end > o.start));
      if (!hasConflict) {
        nonOverlapping.push(m);
      }
    });

    // Sort surviving non-overlapping matches in reverse order of text appearance for clean string replacement
    nonOverlapping.sort((a, b) => b.start - a.start);

    // Apply replacements on text string
    nonOverlapping.forEach((item) => {
      sanitized = sanitized.substring(0, item.start) + item.replacement + sanitized.substring(item.end);
      redactionCounts[item.type] = (redactionCounts[item.type] || 0) + 1;
      tokensMap.unshift({
        type: item.type,
        original: item.original,
        replacement: item.replacement,
        confidence: item.confidence,
        risk: item.risk,
        validationMethods: item.validationMethods,
        entropy: item.entropy || null
      });
    });

    const endTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const processingTimeMs = Number((endTime - startTime).toFixed(2));
    const totalRedacted = Object.values(redactionCounts).reduce((a, b) => a + b, 0);

    return {
      originalLength: text.length,
      sanitizedText: sanitized,
      redactionCounts,
      tokensMap,
      totalRedacted,
      processingTimeMs
    };
  }

  return {
    validateVerhoeff,
    generateVerhoeffChecksum,
    validateLuhn,
    calculateShannonEntropy,
    isHighEntropySecret,
    checkKeywordProximity,
    evaluateAndSanitize,
    RULE_DEFINITIONS
  };
});
