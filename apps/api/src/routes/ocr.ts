import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createWorker } from 'tesseract.js';
import { scanAndSanitize, redactPII } from '../engine/pii';
import { evaluateThreat, dispatchSecurityAlertWebhook } from '../engine/threatEngine';
import { getActivePolicy, matchesCustomKeywords } from '../engine/policy';
import { insertAuditLog } from '../db/index';

export async function registerOcrRoutes(fastify: FastifyInstance) {
  fastify.post('/api/ocr/scan', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = performance.now();
    const clientIp = (request.headers['x-forwarded-for'] as string) || request.ip || '127.0.0.1';

    // 1. Receive uploaded file via @fastify/multipart
    const data = await (request as any).file();
    if (!data) {
      return reply.status(400).send({
        error: {
          message: 'No image file uploaded. Send a multipart/form-data request with a "file" field.',
          type: 'invalid_request_error',
          code: 'missing_file'
        }
      });
    }

    const buffer = await data.toBuffer();
    const policy = getActivePolicy();

    // 2. Initialize Tesseract.js WASM OCR Worker & Extract Text
    let rawExtractedText = '';
    let ocrConfidence = 0;

    try {
      const worker = await createWorker('eng');
      const { data: ocrData } = await worker.recognize(buffer);
      rawExtractedText = ocrData.text.trim();
      ocrConfidence = ocrData.confidence;
      await worker.terminate();
    } catch (ocrErr: any) {
      return reply.status(422).send({
        error: {
          message: `OCR extraction failed: ${ocrErr.message || 'Unknown error during image processing.'}`,
          type: 'ocr_processing_error',
          code: 'ocr_extraction_failed'
        }
      });
    }

    if (!rawExtractedText) {
      const endTime = performance.now();
      const processingTimeMs = Number(Math.max(0.12, endTime - startTime).toFixed(2));

      return reply.status(200).send({
        success: true,
        documentMetadata: {
          fileName: data.filename,
          mimeType: data.mimetype,
          ocrConfidence: 0,
          processedAt: new Date().toISOString()
        },
        content: {
          rawExtractedText: '',
          sanitizedText: '',
          redactedEntities: []
        },
        privacyShieldMeta: {
          intercepted: false,
          actionTaken: 'NO_TEXT_DETECTED',
          activeProfile: policy.activeProfile,
          riskScore: 0,
          piiTypesDetected: [],
          tokensRedacted: 0,
          ocrLatencyMs: processingTimeMs
        }
      });
    }

    // 3. Check Custom Confidential Blacklist Keywords against extracted text
    const matchedKeywords = matchesCustomKeywords(rawExtractedText, policy.customBlockedKeywords);
    if (matchedKeywords.length > 0) {
      const endTime = performance.now();
      const processingTimeMs = Number(Math.max(0.12, endTime - startTime).toFixed(2));

      insertAuditLog({
        client_identifier: clientIp,
        pii_types_detected: ['CONFIDENTIAL_BLACK_KEYWORD', 'OCR_DOCUMENT'],
        tokens_redacted_count: 0,
        proxy_latency_ms: processingTimeMs,
        sanitized_prompt: `[OCR BLOCKED BY CONFIDENTIAL BLACKLIST: ${matchedKeywords.join(', ')}]`,
        upstream_model: 'ocr-tesseract'
      }).catch(err => console.error('Error recording audit log:', err));

      return reply.status(403).send({
        error: {
          message: `[PRIVACYSHIELD OCR INTERCEPT] Document image contains confidential phrase: ${matchedKeywords.join(', ')}`,
          type: 'custom_policy_violation',
          code: 'ocr_confidential_phrase_detected'
        },
        privacyShieldMeta: {
          intercepted: true,
          actionTaken: 'BLOCKED',
          activeProfile: policy.activeProfile,
          matchedCustomKeywords: matchedKeywords,
          ocrLatencyMs: processingTimeMs
        }
      });
    }

    // 4. Evaluate Threat Score (detect prompt injection hidden in document images)
    const piiResult = await redactPII(rawExtractedText, policy.activeProfile);
    const threatEval = evaluateThreat(rawExtractedText, piiResult.detectedPiiTypes);

    if (threatEval.actionTaken !== 'FORWARDED') {
      const endTime = performance.now();
      const processingTimeMs = Number(Math.max(0.12, endTime - startTime).toFixed(2));

      dispatchSecurityAlertWebhook(threatEval, piiResult.detectedPiiTypes);

      insertAuditLog({
        client_identifier: clientIp,
        pii_types_detected: [...piiResult.detectedPiiTypes, `OCR_THREAT_${threatEval.riskLevel}`],
        tokens_redacted_count: piiResult.tokensRedactedCount,
        proxy_latency_ms: processingTimeMs,
        sanitized_prompt: `[OCR BLOCKED BY THREAT ENGINE: ${threatEval.reasons.join(', ')}]`,
        upstream_model: 'ocr-tesseract'
      }).catch(err => console.error('Error recording audit log:', err));

      return reply.status(403).send({
        error: {
          message: `[PRIVACYSHIELD OCR INTERCEPT] Document image contained malicious prompt injection or credential leak.`,
          type: 'security_policy_violation',
          code: 'ocr_threat_detected'
        },
        privacyShieldMeta: {
          intercepted: true,
          actionTaken: threatEval.actionTaken,
          activeProfile: policy.activeProfile,
          riskLevel: threatEval.riskLevel,
          riskScore: threatEval.score,
          reasons: threatEval.reasons,
          piiTypesDetected: piiResult.detectedPiiTypes,
          tokensRedacted: piiResult.tokensRedactedCount,
          ocrLatencyMs: processingTimeMs
        }
      });
    }

    // 5. Build Structured JSON Response with sanitized content
    const endTime = performance.now();
    const processingTimeMs = Number(Math.max(0.12, endTime - startTime).toFixed(2));

    // Convert Map to plain object for JSON serialization
    const tokenMapObj: Record<string, string> = {};
    piiResult.tokenMap.forEach((val, key) => {
      tokenMapObj[key] = val;
    });

    const structuredResponse = {
      success: true,
      documentMetadata: {
        fileName: data.filename,
        mimeType: data.mimetype,
        ocrConfidence: Number(ocrConfidence.toFixed(2)),
        processedAt: new Date().toISOString()
      },
      content: {
        rawExtractedText: rawExtractedText,
        sanitizedText: piiResult.sanitizedText,
        tokenMap: tokenMapObj,
        redactedEntities: piiResult.matches.map(m => ({
          type: m.type,
          placeholder: m.placeholder,
          originalValue: m.originalValue
        }))
      },
      privacyShieldMeta: {
        intercepted: piiResult.tokensRedactedCount > 0,
        actionTaken: piiResult.tokensRedactedCount > 0 ? 'REDACTED_AND_STRUCTURED' : 'CLEAN_DOCUMENT',
        activeProfile: policy.activeProfile,
        riskLevel: threatEval.riskLevel,
        riskScore: threatEval.score,
        piiTypesDetected: piiResult.detectedPiiTypes,
        tokensRedacted: piiResult.tokensRedactedCount,
        ocrLatencyMs: processingTimeMs
      }
    };

    // Async audit log
    insertAuditLog({
      client_identifier: clientIp,
      pii_types_detected: piiResult.detectedPiiTypes.length > 0
        ? [...piiResult.detectedPiiTypes, 'OCR_DOCUMENT']
        : ['OCR_DOCUMENT'],
      tokens_redacted_count: piiResult.tokensRedactedCount,
      proxy_latency_ms: processingTimeMs,
      sanitized_prompt: piiResult.sanitizedText,
      upstream_model: 'ocr-tesseract'
    }).catch(err => console.error('Error recording audit log:', err));

    return reply.status(200).send(structuredResponse);
  });
}
