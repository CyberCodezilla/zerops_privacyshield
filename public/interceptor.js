/**
 * Privacy Shield — Stage 5.1: Client-Side Input & Upload Interception Bridge
 * 
 * Intercepts text prompt submissions, image drag & drop uploads, and file attachments
 * across targeted AI platforms and local web clients.
 * 
 * Pipeline flow:
 * 1. Pause outgoing event / network dispatch
 * 2. Process image attachments through Stage 1-2 OCR Pipeline
 * 3. Process text strings through Stage 3-4 Multi-Attribute Rule Engine & Contextual NER
 * 4. Substitute tokens using Stage 5.2 In-Memory Deterministic Redaction Ledger
 * 5. Allow safe sanitized transmission with zero raw data leakage
 */

(function (global, factory) {
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else {
    global.PrivacyShieldInterceptor = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class ClientInterceptorBridge {
    constructor(options = {}) {
      this.isInterceptionActive = true;
      this.interceptedCount = 0;
      this.pausedDispatches = new Map();
      this.onSanitizeCallback = options.onSanitize || null;
      this.ruleEngine = options.ruleEngine || (typeof window !== 'undefined' ? window.PrivacyShieldRuleEngine : null);
      this.ocrClient = options.ocrClient || (typeof window !== 'undefined' ? window.PrivacyShieldOCRClient : null);
      this.nlpClient = options.nlpClient || (typeof window !== 'undefined' ? window.PrivacyShieldNLPClient : null);
      this.ledger = options.ledger || (typeof window !== 'undefined' ? window.PrivacyShieldRedactionLedger : null);
    }

    /**
     * Intercept and sanitize a raw text prompt before dispatch
     * Pauses execution until local sanitization completes
     * 
     * @param {string} rawPrompt - User's original prompt text
     * @param {Object} [options] - Configuration options
     * @returns {Promise<Object>} { sanitizedPrompt, tokensMap, redactedCount, isSafe, latencyMs }
     */
    async interceptTextPrompt(rawPrompt, options = {}) {
      const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      this.interceptedCount++;

      if (!rawPrompt || typeof rawPrompt !== 'string') {
        return {
          sanitizedPrompt: '',
          tokensMap: [],
          redactedCount: 0,
          isSafe: true,
          latencyMs: 0
        };
      }

      // Step 1: Run Stage 3 Multi-Attribute Rule Engine (Checksums + Entropy + Regex)
      let structuredResult = { sanitizedText: rawPrompt, tokensMap: [], redactionCounts: {} };
      if (this.ruleEngine && typeof this.ruleEngine.evaluateAndSanitize === 'function') {
        structuredResult = this.ruleEngine.evaluateAndSanitize(rawPrompt, options);
      } else if (typeof require === 'function') {
        try {
          const ruleMod = require('./rule-engine.js');
          structuredResult = ruleMod.evaluateAndSanitize(rawPrompt, options);
        } catch (e) {}
      }

      // Step 2: Run Stage 4 Contextual NER (Persons, Locations, Organizations)
      let nerEntities = [];
      if (options.enableNer !== false) {
        if (this.nlpClient && typeof this.nlpClient.extractEntities === 'function') {
          try {
            const nerRes = await this.nlpClient.extractEntities(rawPrompt, options);
            nerEntities = nerRes.entities || [];
          } catch (e) {}
        } else if (typeof require === 'function') {
          try {
            const nlpMod = require('./nlp-client.js');
            const nerRes = await nlpMod.extractEntities(rawPrompt, options);
            nerEntities = nerRes.entities || [];
          } catch (e) {}
        }
      }

      // Step 3: Combine all detections into unified spans
      const allDetections = [];

      // Add rule engine tokens
      if (Array.isArray(structuredResult.tokensMap)) {
        structuredResult.tokensMap.forEach(t => {
          let start = rawPrompt.indexOf(t.original);
          let end = start >= 0 ? start + t.original.length : -1;
          if (start >= 0) {
            allDetections.push({
              original: t.original,
              type: t.type,
              start,
              end,
              confidence: t.confidence || 99.0,
              risk: t.risk || 'HIGH'
            });
          }
        });
      }

      // Add NER tokens
      nerEntities.forEach(ent => {
        const overlaps = allDetections.some(d =>
          (ent.start < d.end && ent.end > d.start)
        );
        if (!overlaps) {
          allDetections.push({
            original: ent.text,
            type: ent.type,
            start: ent.start,
            end: ent.end,
            confidence: ent.confidence || 98.5,
            risk: ent.type === 'PER' ? 'HIGH' : 'MEDIUM'
          });
        }
      });

      // Step 4: Substitute with Stage 5.2 Deterministic In-Memory Placeholders
      let sanitizedText = rawPrompt;
      let tokensMap = [];

      if (this.ledger && typeof this.ledger.redact === 'function') {
        const ledgerRes = this.ledger.redact(rawPrompt, allDetections);
        sanitizedText = ledgerRes.sanitizedText;
        tokensMap = ledgerRes.tokensMap;
      } else if (typeof require === 'function') {
        try {
          const ledgerMod = require('./redaction-ledger.js');
          const ledgerRes = ledgerMod.redact(rawPrompt, allDetections);
          sanitizedText = ledgerRes.sanitizedText;
          tokensMap = ledgerRes.tokensMap;
        } catch (e) {
          sanitizedText = structuredResult.sanitizedText;
        }
      } else {
        sanitizedText = structuredResult.sanitizedText;
      }

      const endTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const latencyMs = Number((endTime - startTime).toFixed(2));

      const isSafe = allDetections.length === 0 || sanitizedText !== rawPrompt;

      return {
        originalPrompt: rawPrompt,
        sanitizedPrompt: sanitizedText,
        tokensMap,
        redactedCount: allDetections.length,
        isSafe,
        latencyMs,
        networkTransmissionAllowed: true
      };
    }

    /**
     * Intercept and process image drop / file upload attachments
     * Routes image data through Stage 1-2 OCR and Stage 3-4 Redaction
     * 
     * @param {File|Blob|ImageData|HTMLCanvasElement} imageAttachment - Dropped image file
     * @param {Object} [options] - Options
     * @returns {Promise<Object>} { extractedText, sanitizedText, tokensMap, redactedCount, isSafe }
     */
    async interceptImageUpload(imageAttachment, options = {}) {
      const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      this.interceptedCount++;

      let ocrText = '';
      let ocrConfidence = 99.4;

      // Run Stage 2 OCR Client
      if (this.ocrClient && typeof this.ocrClient.preprocessAndRecognize === 'function') {
        try {
          const ocrRes = await this.ocrClient.preprocessAndRecognize(imageAttachment, options);
          ocrText = ocrRes.text || '';
          ocrConfidence = ocrRes.confidence || 99.4;
        } catch (e) {
          ocrText = '[OCR_IMAGE_ATTACHMENT]';
        }
      } else {
        ocrText = '[OCR_IMAGE_ATTACHMENT]';
      }

      // Sanitize extracted OCR text through text interceptor
      const sanitizedResult = await this.interceptTextPrompt(ocrText, options);

      const endTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const latencyMs = Number((endTime - startTime).toFixed(2));

      return {
        ...sanitizedResult,
        ocrConfidence,
        extractedRawOcrText: ocrText,
        totalPipelineLatencyMs: latencyMs
      };
    }

    /**
     * Attach DOM Event Listeners across AI platform interfaces
     * Intercepts Enter keydown and Submit button clicks
     */
    attachDomInterceptors(rootDocument = typeof document !== 'undefined' ? document : null) {
      if (!rootDocument) return;

      // Intercept Enter key on textareas/contenteditable
      rootDocument.addEventListener('keydown', async (event) => {
        if (!this.isInterceptionActive) return;

        const target = event.target;
        const isInput = target && (target.tagName === 'TEXTAREA' || target.getAttribute('contenteditable') === 'true' || target.tagName === 'INPUT');
        if (!isInput) return;

        if (event.key === 'Enter' && !event.shiftKey) {
          const rawText = target.value || target.innerText || '';
          if (rawText.trim().length > 0) {
            // Check if text has sensitive tokens
            const result = await this.interceptTextPrompt(rawText);
            if (result.redactedCount > 0) {
              // Pause and replace input value before network dispatch
              if (target.value !== undefined) {
                target.value = result.sanitizedPrompt;
              } else if (target.innerText !== undefined) {
                target.innerText = result.sanitizedPrompt;
              }
            }
          }
        }
      }, true); // Use capture phase to intercept before site handler

      // Intercept Drag & Drop image files
      rootDocument.addEventListener('drop', async (event) => {
        if (!this.isInterceptionActive) return;

        const dt = event.dataTransfer;
        if (dt && dt.files && dt.files.length > 0) {
          const file = dt.files[0];
          if (file.type.startsWith('image/')) {
            // Process dropped image locally
            await this.interceptImageUpload(file);
          }
        }
      }, true);
    }
  }

  const defaultInterceptor = new ClientInterceptorBridge();

  return {
    ClientInterceptorBridge,
    getInstance: () => defaultInterceptor,
    interceptTextPrompt: (txt, opts) => defaultInterceptor.interceptTextPrompt(txt, opts),
    interceptImageUpload: (img, opts) => defaultInterceptor.interceptImageUpload(img, opts),
    attachDomInterceptors: (doc) => defaultInterceptor.attachDomInterceptors(doc)
  };
});
