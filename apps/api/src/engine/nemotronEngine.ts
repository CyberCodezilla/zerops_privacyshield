/**
 * PrivacyShield Nemotron / GLiNER PII Integration Engine
 * Sends HTTP requests to the Python FastAPI NER microservice (nvidia/gliner-pii).
 * Gracefully falls back to empty predictions if service is offline or unreachable.
 */

export interface NemotronEntitySpan {
  label: string;
  text: string;
  start: number;
  end: number;
  score: number;
}

export interface NemotronPredictResponse {
  entities: NemotronEntitySpan[];
  text: string;
  entity_count: number;
}

const NER_SERVICE_URL = process.env.NER_SERVICE_URL || 'http://127.0.0.1:8000/predict';
const DEFAULT_TIMEOUT_MS = 3000;

export async function detectEntitiesWithNemotron(
  text: string,
  threshold: number = 0.3
): Promise<NemotronEntitySpan[]> {
  if (!text || !text.trim()) {
    return [];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(NER_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        threshold
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[Nemotron Engine] NER service returned status ${response.status}. Falling back to empty predictions.`);
      return [];
    }

    const data: NemotronPredictResponse = await response.json();
    return data.entities || [];
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.warn(`[Nemotron Engine] Request to ${NER_SERVICE_URL} timed out after ${DEFAULT_TIMEOUT_MS}ms. Gracefully falling back.`);
    } else {
      console.warn(`[Nemotron Engine] NER service at ${NER_SERVICE_URL} unreachable (${error.message}). Gracefully falling back to empty predictions.`);
    }
    return [];
  }
}

export const detectContextualPII = detectEntitiesWithNemotron;
