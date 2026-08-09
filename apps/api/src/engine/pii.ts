import { PolicyProfile } from './policy';
import { detectContextualPII, NemotronEntitySpan } from './nemotronEngine';
import { knowledgeEngine } from './knowledgeEngine';
import { detectUserLanguage, getSystemLanguageInstruction, SupportedLanguage } from './language';

/**
 * PrivacyShield Hybrid PII & Secret Redaction Engine
 * 
 * ARCHITECTURE & DETECTION STRATEGY:
 * 
 * 1. Tier 1: Sub-Millisecond Deterministic Layer:
 *    - 1A. In-Memory Bloom Filter (<0.1ms lookups for internal asset codenames, keys, MRNs)
 *    - 1B. 22+ Provider-Specific High-Coverage Pattern Scanners (GCP, AWS, GitHub, Stripe, Slack, RSA, Banking, Government IDs)
 *    - 1C. Shannon Entropy Analyzer (Flagging statistical randomness H(X) > 3.8 / 4.3 on contiguous tokens >= 16 chars)
 * 
 * 2. Tier 2: Dynamic Contextual ML Layer (NVIDIA GLiNER / Nemotron Microservice):
 *    - Asynchronous ML span extraction via detectContextualPII for complex entity context.
 *    - Merges ML entity spans with deterministic results prior to token substitution.
 * 
 * 3. Native Multilingual Reasoning & Token Immunity Layer:
 *    - Culture-aware prompt instruction injection for Hindi/Marathi/Hinglish/Minglish context.
 */

export type PIIType = 
  | 'SSN'
  | 'CREDIT_CARD'
  | 'SECRET_KEY'
  | 'EMAIL'
  | 'PHONE'
  | 'PHI_NAME'
  | 'DB_CONNECTION_STRING'
  | 'HIGH_ENTROPY_SECRET'
  | 'KNOWLEDGE_BASE_MATCH'
  | 'PRIVATE_KEY'
  | 'DATABASE_URI'
  | 'AWS_ACCESS_KEY'
  | 'AWS_SECRET_KEY'
  | 'OPENAI_API_KEY'
  | 'ANTHROPIC_API_KEY'
  | 'GITHUB_TOKEN'
  | 'SLACK_WEBHOOK'
  | 'SLACK_BOT_TOKEN'
  | 'GCP_API_KEY'
  | 'STRIPE_KEY'
  | 'SENDGRID_API_KEY'
  | 'TWILIO_API_KEY'
  | 'PASSWORD_ASSIGNMENT'
  | 'HINGLISH_SECRET_JARGON'
  | 'JWT_BEARER'
  | 'AADHAAR_CARD'
  | 'PAN_CARD'
  | 'IBAN_NUMBER'
  | 'SWIFT_BIC'
  | 'IP_ADDRESS';

export interface PIIMatch {
  type: PIIType;
  placeholder: string;
  originalValue: string;
  startIndex: number;
  endIndex: number;
}

export interface SanitizationResult {
  sanitizedText: string;
  matches: PIIMatch[];
  tokenMap: Map<string, string>;
  detectedPiiTypes: string[];
  tokensRedactedCount: number;
  latencyMs: number;
  detectedLanguage?: SupportedLanguage;
  languageInstruction?: string;
}

// 22+ Extended Provider & Secret High-Sensitivity Patterns
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
    label: 'DB_CONNECTION_STRING',
    regex: /(?:jdbc:)?(?:postgresql|postgres|mysql|mongodb|mongodb\+srv|redis|oracle|mssql):\/\/[a-zA-Z0-9_]+:[^@\s]+@[a-zA-Z0-9_.-]+:\d+\/[a-zA-Z0-9_.-]+/gi,
    replacementLabel: '[DATABASE_URI_REDACTED]',
    confidence: 100.0,
    risk: 'CRITICAL'
  },
  // 3. AWS ACCESS KEY ID & SECRET KEY
  {
    label: 'SECRET_KEY',
    regex: /\b(AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16}\b/g,
    replacementLabel: '[AWS_ACCESS_KEY_REDACTED]',
    confidence: 100.0,
    risk: 'CRITICAL'
  },
  {
    label: 'SECRET_KEY',
    regex: /(?:aws_secret_access_key|Secret Access Key|SecretKey|aws_secret)\s*[:=]\s*["']?([a-zA-Z0-9\/+]{40})["']?/gi,
    replacementLabel: '[AWS_SECRET_KEY_REDACTED]',
    confidence: 99.8,
    risk: 'CRITICAL'
  },
  // 4. OPENAI API KEYS
  {
    label: 'SECRET_KEY',
    regex: /\bsk-(?:proj-|admin-)?[a-zA-Z0-9_-]{32,128}\b/g,
    replacementLabel: '[OPENAI_API_KEY_REDACTED]',
    confidence: 100.0,
    risk: 'CRITICAL'
  },
  // 5. ANTHROPIC CLAUDE API KEYS
  {
    label: 'SECRET_KEY',
    regex: /\bsk-ant-api[0-9a-zA-Z-_]{60,128}\b/g,
    replacementLabel: '[ANTHROPIC_API_KEY_REDACTED]',
    confidence: 100.0,
    risk: 'CRITICAL'
  },
  // 6. GITHUB TOKENS & PATs
  {
    label: 'SECRET_KEY',
    regex: /\b(ghp|gho|ghu|ghs|ghr|github_pat)_[a-zA-Z0-9_]{36,255}\b/g,
    replacementLabel: '[GITHUB_TOKEN_REDACTED]',
    confidence: 100.0,
    risk: 'CRITICAL'
  },
  // 7. SLACK WEBHOOKS & BOT TOKENS
  {
    label: 'SECRET_KEY',
    regex: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]+\/B[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+/g,
    replacementLabel: '[SLACK_WEBHOOK_REDACTED]',
    confidence: 99.9,
    risk: 'CRITICAL'
  },
  {
    label: 'SECRET_KEY',
    regex: /\bxox[baprs]-[a-zA-Z0-9_-]{10,255}\b/g,
    replacementLabel: '[SLACK_TOKEN_REDACTED]',
    confidence: 99.9,
    risk: 'CRITICAL'
  },
  // 8. GCP API KEYS
  {
    label: 'SECRET_KEY',
    regex: /\bAIza[0-9A-Za-z-_]{35}\b/g,
    replacementLabel: '[GCP_API_KEY_REDACTED]',
    confidence: 99.7,
    risk: 'CRITICAL'
  },
  // 9. STRIPE KEYS
  {
    label: 'SECRET_KEY',
    regex: /\b(sk|pk|rk)_(test|live)_[0-9a-zA-Z]{24,99}\b/g,
    replacementLabel: '[STRIPE_KEY_REDACTED]',
    confidence: 99.8,
    risk: 'CRITICAL'
  },
  // 10. SENDGRID & TWILIO KEYS
  {
    label: 'SECRET_KEY',
    regex: /\bSG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}\b/g,
    replacementLabel: '[SENDGRID_KEY_REDACTED]',
    confidence: 99.9,
    risk: 'CRITICAL'
  },
  {
    label: 'SECRET_KEY',
    regex: /\b(AC|SK)[a-f0-9]{32}\b/g,
    replacementLabel: '[TWILIO_KEY_REDACTED]',
    confidence: 99.5,
    risk: 'CRITICAL'
  },
  // 11. HARDCODED PASSWORDS & ASSIGNMENT STATEMENTS
  {
    label: 'SECRET_KEY',
    regex: /(?:password|passwd|pass|pwd|api_secret|auth_secret)\s*[:=]\s*["']([^"'\s]{6,64})["']/gi,
    replacementLabel: '[PASSWORD_REDACTED]',
    confidence: 99.2,
    risk: 'CRITICAL'
  },
  // 12. HINGLISH / MINGLISH SENSITIVE JARGON ASSIGNMENTS
  {
    label: 'SECRET_KEY',
    regex: /(?:chabi|chabhi|khufia_code|gupta_key|chupi_key)\s*[:=]\s*["']?([^"'\s]{6,64})["']?/gi,
    replacementLabel: '[HINGLISH_SECRET_REDACTED]',
    confidence: 98.9,
    risk: 'CRITICAL'
  },
  // 13. JWT & BEARER TOKENS
  {
    label: 'SECRET_KEY',
    regex: /Bearer\s+eyJ[a-zA-Z0-9_\-\.=]{20,}/gi,
    replacementLabel: '[JWT_TOKEN_REDACTED]',
    confidence: 99.6,
    risk: 'CRITICAL'
  },
  // 14. AADHAAR CARD (India 12-Digit UIDAI)
  {
    label: 'SECRET_KEY',
    regex: /\b[2-9]{1}\d{3}\s?\d{4}\s?\d{4}\b/g,
    replacementLabel: '[AADHAAR_NUMBER_REDACTED]',
    confidence: 98.5,
    risk: 'CRITICAL'
  },
  // 15. PAN CARD (India 10-Char Tax ID)
  {
    label: 'SECRET_KEY',
    regex: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g,
    replacementLabel: '[PAN_CARD_REDACTED]',
    confidence: 99.1,
    risk: 'CRITICAL'
  },
  // 16. IBAN BANK ACCOUNT NUMBERS
  {
    label: 'SECRET_KEY',
    regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g,
    replacementLabel: '[IBAN_REDACTED]',
    confidence: 98.8,
    risk: 'HIGH'
  },
  // 17. SWIFT / BIC CODES
  {
    label: 'SECRET_KEY',
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
    label: 'SECRET_KEY',
    regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    replacementLabel: '[IP_REDACTED]',
    confidence: 97.8,
    risk: 'LOW'
  }
];

/**
 * Calculate Shannon Entropy of a string: H(X) = -sum(P(x) * log2(P(x)))
 */
export function calculateEntropy(str: string): number {
  const len = str.length;
  if (len === 0) return 0;
  const frequencies: Record<string, number> = {};
  for (const char of str) {
    frequencies[char] = (frequencies[char] || 0) + 1;
  }
  return Object.values(frequencies).reduce((sum, count) => {
    const p = count / len;
    return sum - p * Math.log2(p);
  }, 0);
}

/**
 * Detect high-entropy unknown/unseen secrets
 */
export function detectHighEntropySpans(text: string): Array<{ start: number; end: number; text: string; label: string }> {
  const spans: Array<{ start: number; end: number; text: string; label: string }> = [];
  const tokens = text.match(/\b[a-zA-Z0-9_\-\.]{16,128}\b/g) || [];

  for (const token of tokens) {
    if (calculateEntropy(token) > 3.8 && /[0-9]/.test(token) && /[a-zA-Z]/.test(token)) {
      let startIndex = 0;
      while ((startIndex = text.indexOf(token, startIndex)) !== -1) {
        spans.push({
          start: startIndex,
          end: startIndex + token.length,
          text: token,
          label: 'HIGH_ENTROPY_SECRET'
        });
        startIndex += token.length;
      }
    }
  }

  return spans;
}

// Luhn Algorithm validation for payment cards
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

// Helper to map Nemotron GLiNER entity labels to PrivacyShield PIIMatch types
function mapNemotronLabelToPiiType(label: string): PIIMatch['type'] {
  const norm = label.toUpperCase();
  if (norm.includes('SSN') || norm.includes('SOCIAL_SECURITY')) return 'SSN';
  if (norm.includes('CREDIT') || norm.includes('CARD')) return 'CREDIT_CARD';
  if (norm.includes('SECRET') || norm.includes('KEY') || norm.includes('TOKEN')) return 'SECRET_KEY';
  if (norm.includes('EMAIL')) return 'EMAIL';
  if (norm.includes('PHONE')) return 'PHONE';
  if (norm.includes('DB') || norm.includes('CONNECTION') || norm.includes('CREDENTIAL')) return 'DB_CONNECTION_STRING';
  return 'PHI_NAME';
}

// Helper to map type to token placeholder prefix
function getTokenPrefix(type: PIIMatch['type']): string {
  switch (type) {
    case 'SSN': return 'SSN';
    case 'CREDIT_CARD': return 'CARD';
    case 'SECRET_KEY': return 'SECRET_KEY';
    case 'HIGH_ENTROPY_SECRET': return 'SECRET_KEY';
    case 'KNOWLEDGE_BASE_MATCH': return 'ASSET';
    case 'EMAIL': return 'EMAIL';
    case 'PHONE': return 'PHONE';
    case 'DB_CONNECTION_STRING': return 'DB_CONN';
    case 'PHI_NAME': return 'NAME';
    default: return 'PII';
  }
}

interface InternalSpan {
  type: PIIMatch['type'];
  originalValue: string;
  startIndex: number;
  endIndex: number;
  source: 'BLOOM_FILTER' | 'DETERMINISTIC' | 'ENTROPY' | 'NEMOTRON';
}

/**
 * Main Async PII Redaction Function
 */
export async function redactPII(
  inputText: string,
  profile: PolicyProfile = PolicyProfile.BALANCED,
  selectedLanguage?: string
): Promise<SanitizationResult> {
  const startTime = performance.now();
  const rawSpans: InternalSpan[] = [];

  // Language Detection & Instruction Injection
  const lang = detectUserLanguage(inputText, selectedLanguage);
  const langInstruction = getSystemLanguageInstruction(lang);

  // 1A. Sub-0.1ms In-Memory Bloom Filter Knowledge Base Lookup
  try {
    const kbMatches = knowledgeEngine.scan(inputText);
    for (const match of kbMatches) {
      rawSpans.push({
        type: 'KNOWLEDGE_BASE_MATCH',
        originalValue: match.text,
        startIndex: match.start,
        endIndex: match.end,
        source: 'BLOOM_FILTER'
      });
    }
  } catch (err) {
    console.warn('[PII Engine] Knowledge Base scan skipped:', err);
  }

  // 1B. Gather Extended Deterministic Pattern Spans
  const collectRegexSpans = (
    regex: RegExp,
    type: PIIMatch['type'],
    validator?: (val: string) => boolean
  ) => {
    let match: RegExpExecArray | null;
    const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
    while ((match = re.exec(inputText)) !== null) {
      const val = match[0];
      if (validator && !validator(val)) continue;
      rawSpans.push({
        type,
        originalValue: val,
        startIndex: match.index,
        endIndex: match.index + val.length,
        source: 'DETERMINISTIC'
      });
    }
  };

  // Collect Extended Secret Patterns
  for (const item of EXTENDED_SECRET_PATTERNS) {
    collectRegexSpans(item.regex, item.label as PIIMatch['type']);
  }

  // 1C. Sub-1.0ms Shannon Entropy Analyzer
  const entropySpans = detectHighEntropySpans(inputText);
  for (const span of entropySpans) {
    rawSpans.push({
      type: 'HIGH_ENTROPY_SECRET',
      originalValue: span.text,
      startIndex: span.start,
      endIndex: span.end,
      source: 'ENTROPY'
    });
  }

  // 1D. Standard PII (BALANCED & STRICT)
  if (profile === PolicyProfile.BALANCED || profile === PolicyProfile.STRICT) {
    collectRegexSpans(/\b\d{3}-\d{2}-\d{4}\b/g, 'SSN');
    collectRegexSpans(/\b(?:\d[ -]*?){13,19}\b/g, 'CREDIT_CARD', isValidLuhn);
    collectRegexSpans(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, 'EMAIL');
    collectRegexSpans(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, 'PHONE');
  }

  // 1E. Healthcare PHI & Patient Names
  if (profile === PolicyProfile.STRICT || profile === PolicyProfile.BALANCED) {
    collectRegexSpans(/\bPatient(?:\s+Name)?[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g, 'PHI_NAME');
    collectRegexSpans(/\bMRN[-:\s]*\d{6,10}\b/gi, 'PHI_NAME');
  }

  // 2. Fetch Nemotron ML Contextual Entity Spans
  try {
    const nemotronSpans: NemotronEntitySpan[] = await detectContextualPII(inputText);
    for (const span of nemotronSpans) {
      if (span.start >= 0 && span.end > span.start && span.end <= inputText.length) {
        rawSpans.push({
          type: mapNemotronLabelToPiiType(span.label),
          originalValue: span.text || inputText.substring(span.start, span.end),
          startIndex: span.start,
          endIndex: span.end,
          source: 'NEMOTRON'
        });
      }
    }
  } catch (err) {
    console.warn('[PII Engine] Nemotron contextual PII detection skipped/failed:', err);
  }

  // 3. Merge Spans & Resolve Overlaps (Sort by start index, deterministic/bloom first)
  rawSpans.sort((a, b) => {
    if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
    return (b.endIndex - b.startIndex) - (a.endIndex - a.startIndex);
  });

  const mergedSpans: InternalSpan[] = [];
  for (const span of rawSpans) {
    const overlaps = mergedSpans.some(
      m => !(span.endIndex <= m.startIndex || span.startIndex >= m.endIndex)
    );
    if (!overlaps) {
      mergedSpans.push(span);
    }
  }

  // 4. Perform Token Substitution from Right-to-Left
  mergedSpans.sort((a, b) => b.startIndex - a.startIndex);

  const tokenMap = new Map<string, string>();
  const matches: PIIMatch[] = [];
  const detectedTypesSet = new Set<string>();

  const counters: Record<string, number> = {};

  let sanitizedText = inputText;

  for (const span of mergedSpans) {
    const originalValue = span.originalValue;
    let existingToken: string | undefined;

    for (const [token, val] of tokenMap.entries()) {
      if (val === originalValue) {
        existingToken = token;
        break;
      }
    }

    let placeholder: string;
    if (existingToken) {
      placeholder = existingToken;
    } else {
      counters[span.type] = (counters[span.type] || 0) + 1;
      const prefix = getTokenPrefix(span.type);
      placeholder = `[${prefix}_REDACTED_${counters[span.type]}]`;
      tokenMap.set(placeholder, originalValue);
    }

    detectedTypesSet.add(span.type);
    matches.push({
      type: span.type,
      placeholder,
      originalValue,
      startIndex: span.startIndex,
      endIndex: span.endIndex
    });

    sanitizedText =
      sanitizedText.substring(0, span.startIndex) +
      placeholder +
      sanitizedText.substring(span.endIndex);
  }

  const endTime = performance.now();
  const latencyMs = Number(Math.max(0.08, endTime - startTime).toFixed(2));

  return {
    sanitizedText,
    matches: matches.reverse(), // Restore original left-to-right order
    tokenMap,
    detectedPiiTypes: Array.from(detectedTypesSet),
    tokensRedactedCount: tokenMap.size,
    latencyMs,
    detectedLanguage: lang,
    languageInstruction: langInstruction
  };
}

export const scanAndSanitize = redactPII;
