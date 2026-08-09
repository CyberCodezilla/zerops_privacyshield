/**
 * Session State & Response Rehydration Engine
 * FR-3.1: Stores token mapping dictionaries ([TOKEN] -> OriginalValue) isolated per request context.
 * FR-3.2: Scans returned LLM output for placeholder tokens and re-substitutes original values.
 * FR-3.3: Zero persistence policy - tokens exist exclusively in volatile process memory during request lifecycle.
 */

export class RequestRehydrationSession {
  private tokenMap: Map<string, string>;

  constructor(initialMap?: Map<string, string>) {
    this.tokenMap = new Map(initialMap);
  }

  public registerTokens(map: Map<string, string>) {
    for (const [token, value] of map.entries()) {
      this.tokenMap.set(token, value);
    }
  }

  public getTokenMap(): Map<string, string> {
    return this.tokenMap;
  }

  /**
   * Rehydrates a full string response by replacing tokens with original values
   */
  public rehydrateText(text: string): string {
    if (!text || this.tokenMap.size === 0) {
      return text;
    }

    let result = text;
    for (const [token, originalValue] of this.tokenMap.entries()) {
      // Escape bracket characters for safe regex replacement
      const escapedToken = token.replace(/\[/g, '\\[').replace(/\]/g, '\\]');
      const regex = new RegExp(escapedToken, 'g');
      result = result.replace(regex, originalValue);
    }

    return result;
  }

  /**
   * Rehydrates deeply nested JSON payload (e.g. OpenAI chat completion choice messages)
   */
  public rehydratePayload(payload: any): any {
    if (!payload || typeof payload !== 'object') {
      return payload;
    }

    if (typeof payload === 'string') {
      return this.rehydrateText(payload);
    }

    if (Array.isArray(payload)) {
      return payload.map(item => this.rehydratePayload(item));
    }

    const rehydrated: Record<string, any> = {};
    for (const key of Object.keys(payload)) {
      rehydrated[key] = this.rehydratePayload(payload[key]);
    }

    return rehydrated;
  }

  /**
   * Clean up session RAM
   */
  public destroy(): void {
    this.tokenMap.clear();
  }
}
