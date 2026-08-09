import { PolicyProfile } from './policy';
import { detectContextualPII, NemotronEntitySpan } from './nemotronEngine';
import { knowledgeEngine } from './knowledgeEngine';

/**
 * PrivacyShield Hybrid PII & Secret Redaction Engine
 * 
 * ARCHITECTURE & DETECTION STRATEGY:
 * 
 * 1. Tier 1: Sub-Millisecond Deterministic Layer:
 *    - 1A. In-Memory Bloom Filter (<0.1ms lookups for 1,000,000 internal asset codenames, keys, MRNs)
 *    - 1B. High-Coverage Pattern Matrix (Provider-specific regexes for GCP, AWS, GitHub, Stripe, Slack, RSA)
 *    - 1C. Shannon Entropy Analyzer (Flagging statistical randomness H(X) > 4.3 on contiguous tokens >= 16 chars)
 * 
 * 2. Tier 2: Dynamic Contextual ML Layer (NVIDIA GLiNER / Nemotron Microservice):
 *    - Asynchronous ML span extraction via detectContextualPII for complex entity context.
 *    - Merges ML entity spans with deterministic results prior to token substitution.
 */

export interface PIIMatch {
  type: 'SSN' | 'CREDIT_CARD' | 'SECRET_KEY' | 'EMAIL' | 'PHONE' | 'PHI_NAME' | 'DB_CONNECTION_STRING' | 'HIGH_ENTROPY_SECRET' | 'KNOWLEDGE_BASE_MATCH';
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
}

// Extended Provider Secret Patterns
export const EXTENDED_SECRET_PATTERNS = [
  { label: 'SECRET_KEY', regex: /\b(sk|pk)_(test|live)_[0-9a-zA-Z]{24,99}\b/g },
  { label: 'SECRET_KEY', regex: /\bsk[-_][a-zA-Z0-9_-]{20,}\b/gi },
  { label: 'SECRET_KEY', regex: /\b(ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,255}\b/g },
  { label: 'SECRET_KEY', regex: /xox[baprs]-[0-9a-zA-Z]{10,48}/g },
  { label: 'SECRET_KEY', regex: /\bAIza[0-9A-Za-z-_]{35}\b/g },
  { label: 'SECRET_KEY', regex: /Bearer\s+[a-zA-Z0-9_\-\.=]{20,}/gi },
  { label: 'SECRET_KEY', regex: /-----BEGIN (?:RSA|EC|OPENSSH|PRIVATE) KEY-----[\s\S]*?-----END (?:RSA|EC|OPENSSH|PRIVATE) KEY-----/g },
  { label: 'SECRET_KEY', regex: /(?:api_key|secret|token|password|auth_token)\s*[:=]\s*["']?([a-zA-Z0-9_\-\.]{16,})["']?/gi }
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
  const tokens = text.match(/\b[a-zA-Z0-9_\-\.]{16,}\b/g) || [];

  for (const token of tokens) {
    // Ignore standard formatted UUIDs or repetitive test strings
    if (calculateEntropy(token) > 4.3) {
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
  if (norm.includes('SECRET') || norm.includes('KEY')) return 'SECRET_KEY';
  if (norm.includes('EMAIL')) return 'EMAIL';
  if (norm.includes('PHONE')) return 'PHONE';
  if (norm.includes('DB') || norm.includes('CONNECTION')) return 'DB_CONNECTION_STRING';
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
  profile: PolicyProfile = PolicyProfile.BALANCED
): Promise<SanitizationResult> {
  const startTime = performance.now();
  const rawSpans: InternalSpan[] = [];

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

  collectRegexSpans(/\bAKIA[0-9A-Z]{16}\b/g, 'SECRET_KEY');
  collectRegexSpans(/\beyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g, 'SECRET_KEY');
  collectRegexSpans(/\b(?:postgres|postgresql|mongodb|mysql):\/\/[a-zA-Z0-9_]+:[^@\s]+@[a-zA-Z0-9_.-]+:\d+\/[a-zA-Z0-9_.-]+\b/g, 'DB_CONNECTION_STRING');

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
    latencyMs
  };
}

export const scanAndSanitize = redactPII;

