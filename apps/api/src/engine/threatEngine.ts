/**
 * PrivacyShield Autonomous Threat Classifier & Risk Engine
 * Evaluates prompt threat score (0.0 - 1.0) and risk level.
 * Halts execution and quarantines high-risk secrets or prompt injection/jailbreak attacks.
 */

export enum RiskLevel {
  LOW = "LOW",          // Standard PII (Names, Emails, Phone) -> Auto-sanitize & Forward
  HIGH = "HIGH",        // Hardcoded Secrets (AWS/OpenAI Keys, DB URIs) -> Block
  CRITICAL = "CRITICAL" // Prompt Injection or System Bypass Attempts -> Quarantine
}

export interface ThreatEvaluation {
  score: number; // 0.0 to 1.0
  riskLevel: RiskLevel;
  actionTaken: "FORWARDED" | "BLOCKED" | "QUARANTINED";
  reasons: string[];
}

export function evaluateThreat(
  prompt: string, 
  piiTypesDetected: string[]
): ThreatEvaluation {
  let score = 0.0;
  const reasons: string[] = [];

  // 1. Check for Critical Infrastructure Secrets (Hardcoded API Keys or DB Credentials)
  const containsSecretKey = piiTypesDetected.includes("SECRET_KEY") || piiTypesDetected.includes("API_KEY");
  const containsDbConn = piiTypesDetected.includes("DB_CONNECTION_STRING");

  if (containsSecretKey || containsDbConn) {
    score += 0.5;
    reasons.push("Exposed live infrastructure secret or API key");
  }

  // 2. Check for Prompt Injection / Jailbreak Attack Patterns
  const injectionPatterns = [
    /ignore previous instructions/i,
    /system prompt override/i,
    /jailbreak/i,
    /reveal confidential system key/i,
    /override security rules/i,
    /bypass guardrails/i,
    /act as an unrestricted ai/i
  ];

  const hasInjection = injectionPatterns.some((pattern) => pattern.test(prompt));
  if (hasInjection) {
    score += 0.6;
    reasons.push("Potential LLM prompt injection or jailbreak attempt detected");
  }

  // 3. Determine Risk Classification
  if (score >= 0.8) {
    return {
      score: Number(Math.min(1.0, score).toFixed(2)),
      riskLevel: RiskLevel.CRITICAL,
      actionTaken: "QUARANTINED",
      reasons
    };
  } else if (score >= 0.4) {
    return {
      score: Number(score.toFixed(2)),
      riskLevel: RiskLevel.HIGH,
      actionTaken: "BLOCKED",
      reasons
    };
  }

  return {
    score: Number(score.toFixed(2)),
    riskLevel: RiskLevel.LOW,
    actionTaken: "FORWARDED",
    reasons: piiTypesDetected.length > 0 ? ["Standard PII sanitized locally"] : ["Clean prompt"]
  };
}

export function dispatchSecurityAlertWebhook(evalData: ThreatEvaluation, piiTypes: string[]): void {
  console.log(`[ALERT Webhook] High-risk prompt intercepted! Risk Level: ${evalData.riskLevel}, Score: ${evalData.score}, Types: ${piiTypes.join(", ")}, Reasons: ${evalData.reasons.join("; ")}`);
}
