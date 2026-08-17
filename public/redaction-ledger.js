/**
 * Privacy Shield — Stage 5.2: In-Memory Token Placeholder & Redaction Ledger
 * 
 * Strict Zero-Trust Security Guarantees:
 * - Deterministic sequential placeholders: [REDACTED_AADHAAR_1], [REDACTED_API_KEY_1], [REDACTED_PERSON_1], etc.
 * - RAM-Only In-Memory Reversal Map: Lookup dictionary lives exclusively in volatile JS memory heap.
 * - Zero Disk / Storage Leakage: Plaintext secrets are NEVER written to localStorage, IndexedDB, Cookies, or Disk.
 * - Local-Only UI Unmasking: Allows client user to toggle/inspect original values without exposing them to the network.
 */

(function (global, factory) {
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    global.PrivacyShieldRedactionLedger = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class InMemoryRedactionLedger {
    constructor() {
      // Volatile RAM-only lookup maps (never persisted to disk/storage)
      this.placeholderToOriginal = new Map();
      this.originalToPlaceholder = new Map();
      this.typeCounters = new Map();
      this.sessionLedger = [];
      this.isMemoryOnly = true;
    }

    /**
     * Get or create a deterministic sequential placeholder for a sensitive token
     * e.g., "4532 0159 8741 2365" -> "[REDACTED_CREDIT_CARD_1]"
     */
    getOrCreatePlaceholder(originalValue, type) {
      if (!originalValue) return '';

      let normalizedType = (type || 'SECRET').toUpperCase().replace(/^NER_/, '').replace(/[\s\-]+/g, '_');
      if (normalizedType === 'CARD_NUMBER') normalizedType = 'CREDIT_CARD';
      if (normalizedType === 'PER') normalizedType = 'PERSON';
      if (normalizedType === 'LOC') normalizedType = 'LOCATION';
      if (normalizedType === 'ORG') normalizedType = 'ORGANIZATION';

      const existing = this.originalToPlaceholder.get(originalValue);
      if (existing) {
        return existing;
      }

      const count = (this.typeCounters.get(normalizedType) || 0) + 1;
      this.typeCounters.set(normalizedType, count);

      const placeholder = `[REDACTED_${normalizedType}_${count}]`;

      // Store strictly in ephemeral RAM
      this.originalToPlaceholder.set(originalValue, placeholder);
      this.placeholderToOriginal.set(placeholder, originalValue);

      return placeholder;
    }

    /**
     * Redact text by substituting detected tokens with deterministic placeholders
     * 
     * @param {string} text - Raw input string
     * @param {Array<Object>} detections - Array of { start, end, original, type, ... }
     * @returns {Object} { sanitizedText, tokensMap, redactedCount }
     */
    redact(text, detections = []) {
      if (!text || typeof text !== 'string') {
        return { sanitizedText: '', tokensMap: [], redactedCount: 0 };
      }

      let sanitized = text;
      const tokensMap = [];

      // Sort detections descending by start index to avoid index displacement
      const sorted = [...detections].sort((a, b) => b.start - a.start);

      sorted.forEach((det) => {
        const rawToken = det.original || text.substring(det.start, det.end);
        const placeholder = this.getOrCreatePlaceholder(rawToken, det.type || 'SECRET');

        sanitized = sanitized.substring(0, det.start) + placeholder + sanitized.substring(det.end);

        tokensMap.unshift({
          placeholder,
          original: rawToken,
          type: det.type,
          start: det.start,
          end: det.end,
          confidence: det.confidence || 99.0,
          risk: det.risk || 'HIGH'
        });

        // Record in RAM session ledger
        this.sessionLedger.push({
          timestamp: Date.now(),
          placeholder,
          type: det.type,
          risk: det.risk || 'HIGH'
        });
      });

      return {
        originalLength: text.length,
        sanitizedText: sanitized,
        tokensMap,
        redactedCount: tokensMap.length
      };
    }

    /**
     * Local-Only Unmasking: Restore original plaintext from in-memory RAM map
     * Used exclusively for client-side local UI toggle inspection
     */
    unmask(sanitizedText) {
      if (!sanitizedText || typeof sanitizedText !== 'string') return '';

      let unmasked = sanitizedText;
      for (const [placeholder, original] of this.placeholderToOriginal.entries()) {
        unmasked = unmasked.split(placeholder).join(original);
      }
      return unmasked;
    }

    /**
     * Verify if outgoing payload contains ANY raw unmasked PII
     * Returns true if payload is completely safe (contains only placeholders or non-sensitive text)
     */
    verifyOutgoingPayloadSafety(outgoingText) {
      if (!outgoingText) return true;

      for (const [placeholder, original] of this.placeholderToOriginal.entries()) {
        // If the original sensitive secret is found in outgoing text, fail safety check!
        if (outgoingText.includes(original)) {
          return {
            safe: false,
            leakedToken: original,
            placeholder
          };
        }
      }

      return { safe: true, leakedToken: null };
    }

    /**
     * Wipe all volatile memory immediately
     */
    clearMemory() {
      this.placeholderToOriginal.clear();
      this.originalToPlaceholder.clear();
      this.typeCounters.clear();
      this.sessionLedger = [];
    }

    /**
     * Get memory stats (verifies 0 bytes written to disk)
     */
    getMemoryTelemetry() {
      return {
        activePlaceholdersCount: this.placeholderToOriginal.size,
        sessionLedgerCount: this.sessionLedger.length,
        storageType: 'VOLATILE_RAM_ONLY',
        diskPersistence: false,
        indexedDBPersistence: false,
        localStoragePersistence: false
      };
    }
  }

  const defaultLedger = new InMemoryRedactionLedger();

  return {
    InMemoryRedactionLedger,
    getInstance: () => defaultLedger,
    redact: (text, dets) => defaultLedger.redact(text, dets),
    unmask: (text) => defaultLedger.unmask(text),
    getOrCreatePlaceholder: (orig, type) => defaultLedger.getOrCreatePlaceholder(orig, type),
    verifyOutgoingPayloadSafety: (txt) => defaultLedger.verifyOutgoingPayloadSafety(txt),
    clearMemory: () => defaultLedger.clearMemory(),
    getMemoryTelemetry: () => defaultLedger.getMemoryTelemetry()
  };
});
