// 1. EXTENDED SECRET PATTERNS (MUST RUN BEFORE LOOSE EMAIL/PHONE REGEXES)
export const EXTENDED_SECRET_PATTERNS = [
  // Database Connection URIs & JDBC Strings
  { 
    label: 'DATABASE_URI', 
    regex: /(?:jdbc:)?(?:postgresql|postgres|mysql|mongodb|redis|oracle):\/\/[a-zA-Z0-9_]+:[^@\s]+@[a-zA-Z0-9_.-]+:\d+\/[a-zA-Z0-9_.-]+/gi 
  },
  
  // AWS Access Key ID & AWS Secret Key
  { label: 'AWS_ACCESS_KEY', regex: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { label: 'AWS_SECRET_KEY', regex: /(?:aws_secret_access_key|Secret Access Key|SecretKey)\s*[:=]\s*["']?([a-zA-Z0-9\/+]{40})["']?/gi },
  
  // GitHub Personal Access / OAuth Tokens
  { label: 'GITHUB_TOKEN', regex: /\b(ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,255}\b/g },
  
  // Slack Webhook URLs
  { label: 'SLACK_WEBHOOK', regex: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]+\/B[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+/g },
  
  // Google API & GCP Keys
  { label: 'GCP_API_KEY', regex: /\bAIza[0-9A-Za-z-_]{35}\b/g },
  
  // Stripe Secret & Publishable Keys
  { label: 'STRIPE_KEY', regex: /\b(sk|pk)_(test|live)_[0-9a-zA-Z]{24,99}\b/g },
  
  // Bearer Tokens & JWTs
  { label: 'BEARER_TOKEN', regex: /Bearer\s+[a-zA-Z0-9_\-\.=]{20,}/gi }
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

/**
 * Enhanced Shannon Entropy Analyzer
 * Detects high-randomness hashes (hex/alphanumeric >= 16 chars with H(X) > 3.8)
 */
export function detectHighEntropySpans(text: string): Array<{ start: number; end: number; text: string; label: string }> {
  const spans: Array<{ start: number; end: number; text: string; label: string }> = [];
  const tokens = text.match(/\b[a-zA-Z0-9_\-\.]{16,128}\b/g) || [];

  for (const token of tokens) {
    const entropy = calculateEntropy(token);
    // Lower threshold to 3.8 for mixed alpha-numeric tokens to capture code-block hashes
    if (entropy > 3.8 && /[0-9]/.test(token) && /[a-zA-Z]/.test(token)) {
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
