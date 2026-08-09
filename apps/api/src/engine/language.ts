export type SupportedLanguage = 'en' | 'hi' | 'mr';

/**
 * Detects user language from explicit override or content analysis.
 * Supports Devanagari script detection (\u0900-\u097F) for Hindi vs. Marathi.
 */
export function detectUserLanguage(text: string, selectedOverride?: string): SupportedLanguage {
  // If user explicitly selected a language in the extension/UI, prioritize it
  if (selectedOverride === 'hi') return 'hi';
  if (selectedOverride === 'mr') return 'mr';
  if (selectedOverride === 'en') return 'en';

  if (!text || typeof text !== 'string') return 'en';

  // Check for Devanagari Unicode Range (\u0900-\u097F)
  if (/[\u0900-\u097F]/.test(text)) {
    // Distinguish Marathi vs Hindi specific characters and vocabulary
    if (/[ळिीआहेतहाहोतेखातरलॉगिन]/.test(text) && /आहे|नाही|झाला|केला|tapaasa|zhala/i.test(text)) {
      return 'mr';
    }
    return 'hi';
  }

  // Hinglish / Minglish keywords check
  if (/\b(karo|kare|karte|waqt|ho|gaya|hai|raha|naam|mera|apna|tapaasa|zhala|ahe|krupaya)\b/i.test(text)) {
    if (/\b(zhala|ahe|krupaya|tapaasa|mhnun)\b/i.test(text)) return 'mr';
    return 'hi';
  }

  return 'en';
}

/**
 * Dynamic System Prompt Injector for Native Cultural Reasoning
 * Preserves technical jargon in English/Hinglish/Minglish without literal robotic translation.
 * Enforces strict Redaction Token Immunity.
 */
export function getSystemLanguageInstruction(lang: SupportedLanguage): string {
  switch (lang) {
    case 'hi':
      return `\n\n[LANGUAGE & REASONING INSTRUCTION]: Respond in natural, conversational Hindi (Devanagari script or clean Hinglish depending on context). Maintain technical terms like API, Server, Database, Key, Redaction, SSL, SQL Query, etc., in English/Hinglish jargon. Ensure explanations hit the core logical meaning without robotic word-for-word translation (e.g. use "Database connect karte waqt timeout ho gaya hai" instead of literal word translations). DO NOT translate or alter redaction tokens like [SECRET_KEY_REDACTED_1] or [SSN_REDACTED_1].`;
    
    case 'mr':
      return `\n\n[LANGUAGE & REASONING INSTRUCTION]: Respond in natural, conversational Marathi. Maintain technical terms like API, Server, Database, Code, Redaction, SSL, Query, etc., in English/Marathi technical jargon. Ensure explanations are clear, natural, and logical (e.g. "Database connection timeout zhala ahe, krupaya server configurations tapaasa"). DO NOT translate or alter redaction tokens like [SECRET_KEY_REDACTED_1] or [SSN_REDACTED_1].`;

    case 'en':
    default:
      return `\n\n[LANGUAGE & REASONING INSTRUCTION]: Respond in clear, professional English. Maintain technical terms. DO NOT translate or alter redaction tokens like [SECRET_KEY_REDACTED_1] or [SSN_REDACTED_1].`;
  }
}
