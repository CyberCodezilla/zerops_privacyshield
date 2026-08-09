/**
 * PrivacyShield Dynamic Policy Engine & Custom Blacklist Manager
 * Defines compliance profiles (STRICT, BALANCED, PERMISSIVE) and custom keyword enforcement.
 */

export enum PolicyProfile {
  STRICT = "STRICT",       // HIPAA / FinTech: Redact ALL PII (Names, SSN, PCI, Medical IDs, Emails, Phone) and Block Secrets
  BALANCED = "BALANCED",   // DevSecOps (Default): Redact Secrets, SSNs, Credit Cards, Emails, Phone; Allow general names
  PERMISSIVE = "PERMISSIVE" // Redact Secrets & Critical Credentials only
}

export interface PolicyConfig {
  activeProfile: PolicyProfile;
  customBlockedKeywords: string[];
  blockOnHighRisk: boolean;
}

// Default in-memory state (Can be synced with PostgreSQL 'db' service)
let currentPolicy: PolicyConfig = {
  activeProfile: PolicyProfile.BALANCED,
  customBlockedKeywords: ["ProjectManhattan", "SecretCodenameX"],
  blockOnHighRisk: true,
};

export function getActivePolicy(): PolicyConfig {
  return currentPolicy;
}

export function updateActivePolicy(newConfig: Partial<PolicyConfig>): PolicyConfig {
  currentPolicy = {
    ...currentPolicy,
    ...newConfig,
    customBlockedKeywords: newConfig.customBlockedKeywords 
      ? Array.from(new Set(newConfig.customBlockedKeywords))
      : currentPolicy.customBlockedKeywords
  };
  return currentPolicy;
}

export function matchesCustomKeywords(text: string, keywords: string[]): string[] {
  if (!text || !keywords || keywords.length === 0) return [];
  const matched: string[] = [];
  const lowerText = text.toLowerCase();

  for (const kw of keywords) {
    if (kw && lowerText.includes(kw.toLowerCase())) {
      matched.push(kw);
    }
  }
  return matched;
}
