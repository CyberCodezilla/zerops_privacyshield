/**
 * Comprehensive Enterprise PII & Secret Redaction Engine
 * 25+ Priority High-Sensitivity Scanners + Shannon Entropy Analyzer
 */

export const EXTENDED_SECRET_PATTERNS = [
  // 1. RSA / OpenSSH / EC / PGP PRIVATE KEYS
  {
    label: 'PRIVATE_KEY',
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/gi,
    replacementLabel: '[RSA_PRIVATE_KEY_REDACTED]',
    confidence: 100.0,
    risk: 'CRITICAL'
  },
  // 2. DATABASE CONNECTION URIS (JDBC, Postgres, MySQL, MongoDB, Redis, Oracle)
  {
    label: 'DATABASE_URI',
    regex: /(?:jdbc:)?(?:postgresql|postgres|mysql|mongodb|mongodb\+srv|redis|oracle|mssql):\/\/[a-zA-Z0-9_]+:[^@\s]+@[a-zA-Z0-9_.-]+:\d+\/[a-zA-Z0-9_.-]+/gi,
    replacementLabel: '[DATABASE_URI_REDACTED]',
    confidence: 100.0,
    risk: 'CRITICAL'
  },
  // 3. AWS ACCESS KEY ID & SECRET KEY
  {
    label: 'AWS_ACCESS_KEY',
    regex: /\b(AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16}\b/g,
    replacementLabel: '[AWS_ACCESS_KEY_REDACTED]',
    confidence: 100.0,
    risk: 'CRITICAL'
  },
  {
    label: 'AWS_SECRET_KEY',
    regex: /(?:aws_secret_access_key|Secret Access Key|SecretKey|aws_secret)\s*[:=]\s*["']?([a-zA-Z0-9\/+]{40})["']?/gi,
    replacementLabel: 'aws_secret_access_key: [AWS_SECRET_KEY_REDACTED]',
    confidence: 99.8,
    risk: 'CRITICAL'
  },
  // 4. OPENAI API KEYS
  {
    label: 'OPENAI_API_KEY',
    regex: /\bsk-(?:proj-|admin-)?[a-zA-Z0-9_-]{32,128}\b/g,
    replacementLabel: '[OPENAI_API_KEY_REDACTED]',
    confidence: 100.0,
    risk: 'CRITICAL'
  },
  // 5. ANTHROPIC CLAUDE API KEYS
  {
    label: 'ANTHROPIC_API_KEY',
    regex: /\bsk-ant-api[0-9a-zA-Z-_]{60,128}\b/g,
    replacementLabel: '[ANTHROPIC_API_KEY_REDACTED]',
    confidence: 100.0,
    risk: 'CRITICAL'
  },
  // 6. GITHUB TOKENS & PATs
  {
    label: 'GITHUB_TOKEN',
    regex: /\b(ghp|gho|ghu|ghs|ghr|github_pat)_[a-zA-Z0-9_]{36,255}\b/g,
    replacementLabel: '[GITHUB_TOKEN_REDACTED]',
    confidence: 100.0,
    risk: 'CRITICAL'
  },
  // 7. SLACK WEBHOOKS & BOT TOKENS
  {
    label: 'SLACK_WEBHOOK',
    regex: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]+\/B[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+/g,
    replacementLabel: '[SLACK_WEBHOOK_REDACTED]',
    confidence: 99.9,
    risk: 'CRITICAL'
  },
  {
    label: 'SLACK_BOT_TOKEN',
    regex: /\bxox[baprs]-[a-zA-Z0-9_-]{10,255}\b/g,
    replacementLabel: '[SLACK_TOKEN_REDACTED]',
    confidence: 99.9,
    risk: 'CRITICAL'
  },
  // 8. GCP API KEYS
  {
    label: 'GCP_API_KEY',
    regex: /\bAIza[0-9A-Za-z-_]{35}\b/g,
    replacementLabel: '[GCP_API_KEY_REDACTED]',
    confidence: 99.7,
    risk: 'CRITICAL'
  },
  // 9. STRIPE KEYS
  {
    label: 'STRIPE_KEY',
    regex: /\b(sk|pk|rk)_(test|live)_[0-9a-zA-Z]{24,99}\b/g,
    replacementLabel: '[STRIPE_KEY_REDACTED]',
    confidence: 99.8,
    risk: 'CRITICAL'
  },
  // 10. SENDGRID & TWILIO KEYS
  {
    label: 'SENDGRID_API_KEY',
    regex: /\bSG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}\b/g,
    replacementLabel: '[SENDGRID_KEY_REDACTED]',
    confidence: 99.9,
    risk: 'CRITICAL'
  },
  {
    label: 'TWILIO_API_KEY',
    regex: /\b(AC|SK)[a-f0-9]{32}\b/g,
    replacementLabel: '[TWILIO_KEY_REDACTED]',
    confidence: 99.5,
    risk: 'CRITICAL'
  },
  // 11. HARDCODED PASSWORDS & ASSIGNMENT STATEMENTS
  {
    label: 'PASSWORD_ASSIGNMENT',
    regex: /(?:password|passwd|pass|pwd|api_secret|auth_secret)\s*[:=]\s*["']([^"'\s]{6,64})["']/gi,
    replacementLabel: 'password: "[PASSWORD_REDACTED]"',
    confidence: 99.2,
    risk: 'CRITICAL'
  },
  // 12. HINGLISH / MINGLISH SENSITIVE JARGON ASSIGNMENTS
  {
    label: 'HINGLISH_SECRET_JARGON',
    regex: /(?:chabi|chabhi|khufia_code|gupta_key|chupi_key)\s*[:=]\s*["']?([^"'\s]{6,64})["']?/gi,
    replacementLabel: 'chabi: "[HINGLISH_SECRET_REDACTED]"',
    confidence: 98.9,
    risk: 'CRITICAL'
  },
  // 13. JWT & BEARER TOKENS
  {
    label: 'JWT_BEARER',
    regex: /Bearer\s+eyJ[a-zA-Z0-9_\-\.=]{20,}/gi,
    replacementLabel: 'Bearer [JWT_TOKEN_REDACTED]',
    confidence: 99.6,
    risk: 'CRITICAL'
  },
  // 14. AADHAAR CARD (India 12-Digit UIDAI)
  {
    label: 'AADHAAR_CARD',
    regex: /\b[2-9]{1}\d{3}\s?\d{4}\s?\d{4}\b/g,
    replacementLabel: '[AADHAAR_NUMBER_REDACTED]',
    confidence: 98.5,
    risk: 'CRITICAL'
  },
  // 15. PAN CARD (India 10-Char Tax ID)
  {
    label: 'PAN_CARD',
    regex: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g,
    replacementLabel: '[PAN_CARD_REDACTED]',
    confidence: 99.1,
    risk: 'CRITICAL'
  },
  // 16. IBAN BANK ACCOUNT NUMBERS
  {
    label: 'IBAN_NUMBER',
    regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g,
    replacementLabel: '[IBAN_REDACTED]',
    confidence: 98.8,
    risk: 'HIGH'
  },
  // 17. SWIFT / BIC CODES
  {
    label: 'SWIFT_BIC',
    regex: /\b[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?\b/g,
    replacementLabel: '[SWIFT_BIC_REDACTED]',
    confidence: 97.5,
    risk: 'MEDIUM'
  },
  // 18. EMAIL ADDRESSES
  {
    label: 'EMAIL',
    regex: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
    replacementLabel: '[EMAIL_REDACTED]',
    confidence: 99.4,
    risk: 'HIGH'
  },
  // 19. SOCIAL SECURITY NUMBERS (US SSN)
  {
    label: 'SSN',
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacementLabel: '[SSN_REDACTED]',
    confidence: 99.9,
    risk: 'CRITICAL'
  },
  // 20. CREDIT CARDS
  {
    label: 'CREDIT_CARD',
    regex: /\b(?:\d[ -]*?){13,19}\b/g,
    replacementLabel: '[CREDIT_CARD_REDACTED]',
    confidence: 99.8,
    risk: 'CRITICAL'
  },
  // 21. PHONE NUMBERS
  {
    label: 'PHONE',
    regex: /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacementLabel: '[PHONE_REDACTED]',
    confidence: 96.5,
    risk: 'MEDIUM'
  },
  // 22. IP ADDRESSES
  {
    label: 'IP_ADDRESS',
    regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    replacementLabel: '[IP_REDACTED]',
    confidence: 97.8,
    risk: 'LOW'
  }
];

export function calculateEntropy(str: string): number {
  const len = str.length;
  if (len === 0) return 0;
  const freq: { [key: string]: number } = {};
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

export function detectHighEntropySpans(text: string) {
  const spans = [];
  const tokens = text.match(/\b[a-zA-Z0-9_\-\.]{16,128}\b/g) || [];

  for (const token of tokens) {
    const entropy = calculateEntropy(token);
    if (entropy > 3.8 && /[0-9]/.test(token) && /[a-zA-Z]/.test(token)) {
      spans.push({
        text: token,
        entropy: entropy.toFixed(2),
        label: 'HIGH_ENTROPY_SECRET'
      });
    }
  }
  return spans;
}
