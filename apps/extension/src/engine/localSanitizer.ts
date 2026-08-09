export interface PIIMatch {
  type: 'SSN' | 'CREDIT_CARD' | 'SECRET_KEY' | 'EMAIL' | 'PHONE' | 'PHI_NAME' | 'DB_CONNECTION_STRING';
  placeholder: string;
  originalValue: string;
  startIndex: number;
  endIndex: number;
}

export interface LocalSanitizeResult {
  sanitizedText: string;
  matches: PIIMatch[];
  tokenMap: Map<string, string>;
  detectedPiiTypes: string[];
  tokensRedactedCount: number;
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

interface InternalSpan {
  type: PIIMatch['type'];
  originalValue: string;
  startIndex: number;
  endIndex: number;
}

export async function sanitizeTextClientSide(
  inputText: string,
  apiUrl: string = 'https://api-zerops.privacyshield.app',
  profile: 'STRICT' | 'BALANCED' | 'PERMISSIVE' = 'BALANCED'
): Promise<LocalSanitizeResult> {
  if (!inputText || !inputText.trim()) {
    return {
      sanitizedText: inputText,
      matches: [],
      tokenMap: new Map(),
      detectedPiiTypes: [],
      tokensRedactedCount: 0
    };
  }

  const spans: InternalSpan[] = [];

  const addRegexSpans = (regex: RegExp, type: PIIMatch['type'], validator?: (v: string) => boolean) => {
    let match: RegExpExecArray | null;
    const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
    while ((match = re.exec(inputText)) !== null) {
      const val = match[0];
      if (validator && !validator(val)) continue;
      spans.push({
        type,
        originalValue: val,
        startIndex: match.index,
        endIndex: match.index + val.length
      });
    }
  };

  // 1. Secrets & Credentials
  addRegexSpans(/\bsk[-_][a-zA-Z0-9_-]{20,}\b/gi, 'SECRET_KEY');
  addRegexSpans(/\bAKIA[0-9A-Z]{16}\b/g, 'SECRET_KEY');
  addRegexSpans(/\beyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g, 'SECRET_KEY');
  addRegexSpans(/\b(?:postgres|postgresql|mongodb|mysql):\/\/[a-zA-Z0-9_]+:[^@\s]+@[a-zA-Z0-9_.-]+:\d+\/[a-zA-Z0-9_.-]+\b/g, 'DB_CONNECTION_STRING');

  // 2. PII Pattern Matches
  if (profile === 'BALANCED' || profile === 'STRICT') {
    addRegexSpans(/\b\d{3}-\d{2}-\d{4}\b/g, 'SSN');
    addRegexSpans(/\b(?:\d[ -]*?){13,19}\b/g, 'CREDIT_CARD', isValidLuhn);
    addRegexSpans(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, 'EMAIL');
    addRegexSpans(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, 'PHONE');
  }

  if (profile === 'STRICT' || profile === 'BALANCED') {
    addRegexSpans(/\bPatient(?:\s+Name)?[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g, 'PHI_NAME');
    addRegexSpans(/\bMRN[-:\s]*\d{6,10}\b/gi, 'PHI_NAME');
  }

  // 3. Optional Async Fetch to Zerops Nemotron PII Endpoint
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);

    const nerResponse = await fetch(`${apiUrl}/api/scan-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: inputText }),
      signal: controller.signal
    });
    clearTimeout(timer);

    if (nerResponse.ok) {
      const data = await nerResponse.json();
      if (data.matches && Array.isArray(data.matches)) {
        for (const m of data.matches) {
          if (m.originalValue && m.type) {
            const idx = inputText.indexOf(m.originalValue);
            if (idx >= 0) {
              spans.push({
                type: m.type as PIIMatch['type'],
                originalValue: m.originalValue,
                startIndex: idx,
                endIndex: idx + m.originalValue.length
              });
            }
          }
        }
      }
    }
  } catch {
    // Graceful offline fallback to client-side regex
  }

  // Deduplicate and resolve overlapping spans
  spans.sort((a, b) => a.startIndex - b.startIndex);
  const merged: InternalSpan[] = [];
  for (const s of spans) {
    const overlaps = merged.some(m => !(s.endIndex <= m.startIndex || s.startIndex >= m.endIndex));
    if (!overlaps) merged.push(s);
  }

  // Substitution from Right to Left
  merged.sort((a, b) => b.startIndex - a.startIndex);

  const tokenMap = new Map<string, string>();
  const matches: PIIMatch[] = [];
  const detectedTypesSet = new Set<string>();
  const counters: Record<string, number> = {};

  let sanitized = inputText;

  for (const span of merged) {
    let existingToken: string | undefined;
    for (const [token, val] of tokenMap.entries()) {
      if (val === span.originalValue) {
        existingToken = token;
        break;
      }
    }

    let placeholder: string;
    if (existingToken) {
      placeholder = existingToken;
    } else {
      counters[span.type] = (counters[span.type] || 0) + 1;
      const prefix = span.type === 'CREDIT_CARD' ? 'CARD' : span.type === 'DB_CONNECTION_STRING' ? 'DB_CONN' : span.type === 'PHI_NAME' ? 'NAME' : span.type;
      placeholder = `[${prefix}_REDACTED_${counters[span.type]}]`;
      tokenMap.set(placeholder, span.originalValue);
    }

    detectedTypesSet.add(span.type);
    matches.push({
      type: span.type,
      placeholder,
      originalValue: span.originalValue,
      startIndex: span.startIndex,
      endIndex: span.endIndex
    });

    sanitized = sanitized.substring(0, span.startIndex) + placeholder + sanitized.substring(span.endIndex);
  }

  return {
    sanitizedText: sanitized,
    matches: matches.reverse(),
    tokenMap,
    detectedPiiTypes: Array.from(detectedTypesSet),
    tokensRedactedCount: tokenMap.size
  };
}
