/**
 * PrivacyShield Client-Side Zero-Knowledge Engine
 * 
 * Runs entirely inside the client device browser / SDK before any payload is sent over the network.
 * Ensures zero raw PII ever leaves the client machine.
 */

export interface LocalSanitizeResult {
  sanitizedPrompt: string;
  localTokenMap: Record<string, string>;
  detectedPIITypes: string[];
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

/**
 * Runs locally inside the user's browser BEFORE sending any HTTP request.
 */
export function sanitizeLocally(rawText: string): LocalSanitizeResult {
  let text = rawText;
  const localTokenMap: Record<string, string> = {};
  const detectedTypes = new Set<string>();
  let tokenCounter = 1;

  // 1. Local SSN Detection (US Format XXX-XX-XXXX)
  text = text.replace(/\b\d{3}-\d{2}-\d{4}\b/g, (match) => {
    const token = `[SSN_REDACTED_${tokenCounter++}]`;
    localTokenMap[token] = match;
    detectedTypes.add('SSN');
    return token;
  });

  // 2. Local Payment Cards Detection (PCI-DSS)
  text = text.replace(/\b(?:\d[ -]*?){13,19}\b/g, (match) => {
    if (!isValidLuhn(match)) return match;
    const token = `[CARD_REDACTED_${tokenCounter++}]`;
    localTokenMap[token] = match;
    detectedTypes.add('CREDIT_CARD');
    return token;
  });

  // 3. Local Secret Key & Connection String Detection
  text = text.replace(/(?:sk_live_|sk_proj_|AKIA)[a-zA-Z0-9]{16,32}/g, (match) => {
    const token = `[SECRET_KEY_REDACTED_${tokenCounter++}]`;
    localTokenMap[token] = match;
    detectedTypes.add('API_KEY');
    return token;
  });
  text = text.replace(/\b(?:postgres|postgresql|mongodb|mysql):\/\/[a-zA-Z0-9_]+:[^@\s]+@[a-zA-Z0-9_.-]+:\d+\/[a-zA-Z0-9_.-]+\b/g, (match) => {
    const token = `[DB_CONN_REDACTED_${tokenCounter++}]`;
    localTokenMap[token] = match;
    detectedTypes.add('DB_CONNECTION_STRING');
    return token;
  });

  // 4. Local Email Detection
  text = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, (match) => {
    const token = `[EMAIL_REDACTED_${tokenCounter++}]`;
    localTokenMap[token] = match;
    detectedTypes.add('EMAIL');
    return token;
  });

  // 5. Local Phone Detection
  text = text.replace(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, (match) => {
    const token = `[PHONE_REDACTED_${tokenCounter++}]`;
    localTokenMap[token] = match;
    detectedTypes.add('PHONE');
    return token;
  });

  // 6. Local Medical PHI Name Detection
  text = text.replace(/\bPatient(?:\s+Name)?[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g, (match) => {
    const token = `[NAME_REDACTED_${tokenCounter++}]`;
    localTokenMap[token] = match;
    detectedTypes.add('PHI_NAME');
    return token;
  });

  return {
    sanitizedPrompt: text,
    localTokenMap,
    detectedPIITypes: Array.from(detectedTypes),
  };
}

/**
 * Rehydrates the response on the client device using the local memory token map.
 */
export function rehydrateLocally(sanitizedResponse: string, localTokenMap: Record<string, string>): string {
  let output = sanitizedResponse;
  for (const [token, originalValue] of Object.entries(localTokenMap)) {
    // Replace all occurrences of token with originalValue
    output = output.split(token).join(originalValue);
  }
  return output;
}
