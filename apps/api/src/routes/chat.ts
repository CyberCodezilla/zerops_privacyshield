import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { scanAndSanitize } from '../engine/pii';
import { RequestRehydrationSession } from '../engine/rehydrate';
import { forwardToUpstream } from '../services/upstream';
import { insertAuditLog } from '../db/index';
import { evaluateThreat, dispatchSecurityAlertWebhook } from '../engine/threatEngine';
import { getActivePolicy, matchesCustomKeywords } from '../engine/policy';

export async function registerChatRoutes(fastify: FastifyInstance) {
  fastify.post('/v1/chat/completions', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = performance.now();
    const body = request.body as any || {};
    const authHeader = request.headers['authorization'] as string || '';
    const isStream = Boolean(body.stream);
    const isZK = Boolean(body.zeroKnowledgeMode);
    const clientIp = (request.headers['x-forwarded-for'] as string) || request.ip || '127.0.0.1';
    const policy = getActivePolicy();

    if (!body.messages || !Array.isArray(body.messages)) {
      return reply.status(400).send({
        error: {
          message: "Invalid request payload. 'messages' array is required.",
          type: 'invalid_request_error',
          code: 'missing_required_field'
        }
      });
    }

    // Extract raw user prompt text for custom keyword check
    let rawUserPromptText = '';
    for (const msg of body.messages) {
      if (msg.role === 'user') {
        if (typeof msg.content === 'string') {
          rawUserPromptText += (rawUserPromptText ? '\n' : '') + msg.content;
        } else if (Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (part.type === 'text' && typeof part.text === 'string') {
              rawUserPromptText += (rawUserPromptText ? '\n' : '') + part.text;
            }
          }
        }
      }
    }

    // 1. Check Custom Confidential Blacklist Keywords
    const matchedKeywords = matchesCustomKeywords(rawUserPromptText, policy.customBlockedKeywords);
    if (matchedKeywords.length > 0) {
      const endTime = performance.now();
      const totalProxyLatencyMs = Number(Math.max(0.12, endTime - startTime).toFixed(2));

      insertAuditLog({
        client_identifier: clientIp,
        pii_types_detected: ['CONFIDENTIAL_BLACK_KEYWORD'],
        tokens_redacted_count: 0,
        proxy_latency_ms: totalProxyLatencyMs,
        sanitized_prompt: `[BLOCKED BY CONFIDENTIAL BLACKLIST KEYWORD: ${matchedKeywords.join(', ')}] ${rawUserPromptText}`,
        upstream_model: body.model || 'gpt-4o'
      }).catch(err => console.error('Error recording audit log:', err));

      return reply.status(403).send({
        error: {
          message: `[PRIVACYSHIELD INTERCEPT] Request blocked by custom compliance rule. Contains confidential phrase: ${matchedKeywords.join(', ')}`,
          type: 'custom_policy_violation',
          code: 'confidential_phrase_detected'
        },
        privacyShieldMeta: {
          zeroKnowledgeMode: isZK,
          intercepted: true,
          actionTaken: 'BLOCKED',
          activeProfile: policy.activeProfile,
          matchedCustomKeywords: matchedKeywords,
          proxyLatencyMs: totalProxyLatencyMs
        }
      });
    }

    // 2. Intercept & Sanitize Prompt Payload according to Active Policy Profile
    const rehydrationSession = new RequestRehydrationSession();
    let sanitizedBody: any = body;
    let detectedPiiTypesArray: string[] = [];
    let totalTokensRedacted = 0;
    let fullSanitizedPromptText = '';

    if (isZK) {
      // Zero-Knowledge Mode: Payload was pre-sanitized on client device in browser RAM
      detectedPiiTypesArray = ['CLIENT_SIDE_ENCRYPTED'];
      fullSanitizedPromptText = rawUserPromptText || '[Pre-Sanitized Client Prompt]';
    } else {
      // Standard Proxy Mode: Gateway performs PII scanning matching active PolicyProfile
      const sanitizedMessages: any[] = [];
      const allDetectedTypes = new Set<string>();

      for (const msg of body.messages) {
        if (typeof msg.content === 'string') {
          const result = scanAndSanitize(msg.content, policy.activeProfile);
          rehydrationSession.registerTokens(result.tokenMap);
          result.detectedPiiTypes.forEach(t => allDetectedTypes.add(t));
          totalTokensRedacted += result.tokensRedactedCount;
          
          sanitizedMessages.push({
            ...msg,
            content: result.sanitizedText
          });

          if (msg.role === 'user') {
            fullSanitizedPromptText += (fullSanitizedPromptText ? '\n' : '') + result.sanitizedText;
          }
        } else if (Array.isArray(msg.content)) {
          const sanitizedParts: any[] = [];
          for (const part of msg.content) {
            if (part.type === 'text' && typeof part.text === 'string') {
              const result = scanAndSanitize(part.text, policy.activeProfile);
              rehydrationSession.registerTokens(result.tokenMap);
              result.detectedPiiTypes.forEach(t => allDetectedTypes.add(t));
              totalTokensRedacted += result.tokensRedactedCount;

              sanitizedParts.push({
                ...part,
                text: result.sanitizedText
              });

              if (msg.role === 'user') {
                fullSanitizedPromptText += (fullSanitizedPromptText ? '\n' : '') + result.sanitizedText;
              }
            } else {
              sanitizedParts.push(part);
            }
          }
          sanitizedMessages.push({
            ...msg,
            content: sanitizedParts
          });
        } else {
          sanitizedMessages.push(msg);
        }
      }

      sanitizedBody = {
        ...body,
        messages: sanitizedMessages
      };

      detectedPiiTypesArray = Array.from(allDetectedTypes);
    }

    // 3. Evaluate Threat Score and Risk Level
    const threatEval = evaluateThreat(rawUserPromptText || fullSanitizedPromptText, detectedPiiTypesArray);

    // 4. AUTONOMOUS BLOCKING: Intercept High/Critical Threats
    if (threatEval.actionTaken !== "FORWARDED") {
      const endTime = performance.now();
      const totalProxyLatencyMs = Number(Math.max(0.12, endTime - startTime).toFixed(2));

      dispatchSecurityAlertWebhook(threatEval, detectedPiiTypesArray);

      insertAuditLog({
        client_identifier: clientIp,
        pii_types_detected: [...detectedPiiTypesArray, `THREAT_${threatEval.riskLevel}`],
        tokens_redacted_count: totalTokensRedacted,
        proxy_latency_ms: totalProxyLatencyMs,
        sanitized_prompt: `[BLOCKED BY PRIVACYSHIELD THREAT ENGINE: ${threatEval.reasons.join(', ')}] ${fullSanitizedPromptText}`,
        upstream_model: body.model || 'gpt-4o'
      }).catch(err => console.error('Error recording audit log:', err));

      rehydrationSession.destroy();

      return reply.status(403).send({
        error: {
          message: `[PRIVACYSHIELD INTERCEPT] Request autonomously blocked due to ${threatEval.riskLevel} risk rating (${threatEval.reasons.join(', ')}).`,
          type: 'security_policy_violation',
          code: 'pii_risk_threshold_exceeded'
        },
        privacyShieldMeta: {
          zeroKnowledgeMode: isZK,
          intercepted: true,
          actionTaken: threatEval.actionTaken,
          activeProfile: policy.activeProfile,
          riskLevel: threatEval.riskLevel,
          riskScore: threatEval.score,
          reasons: threatEval.reasons,
          piiTypesDetected: detectedPiiTypesArray,
          tokensRedacted: totalTokensRedacted,
          proxyLatencyMs: totalProxyLatencyMs
        }
      });
    }

    // 5. Safe Requests Proceed to Upstream LLM
    if (isStream) {
      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache');
      reply.raw.setHeader('Connection', 'keep-alive');

      await forwardToUpstream(
        {
          apiKey: authHeader,
          body: sanitizedBody,
          stream: true
        },
        (chunkText: string) => {
          if (isZK) {
            reply.raw.write(chunkText);
          } else {
            const lines = chunkText.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const jsonStr = line.substring(6);
                  const chunkObj = JSON.parse(jsonStr);
                  const rehydratedObj = rehydrationSession.rehydratePayload(chunkObj);
                  reply.raw.write(`data: ${JSON.stringify(rehydratedObj)}\n\n`);
                } catch {
                  reply.raw.write(`${line}\n`);
                }
              } else if (line.trim()) {
                reply.raw.write(`${line}\n`);
              }
            }
          }
        }
      );

      const endTime = performance.now();
      const totalProxyLatencyMs = Number(Math.max(0.12, endTime - startTime).toFixed(2));

      insertAuditLog({
        client_identifier: clientIp,
        pii_types_detected: detectedPiiTypesArray,
        tokens_redacted_count: isZK ? 1 : totalTokensRedacted,
        proxy_latency_ms: totalProxyLatencyMs,
        sanitized_prompt: fullSanitizedPromptText || '[Pre-Sanitized Client Prompt]',
        upstream_model: body.model || 'gpt-4o'
      }).catch(err => console.error('Error recording audit log:', err));

      rehydrationSession.destroy();
      reply.raw.end();
      return reply;
    }

    // Standard Non-Streaming Handling
    const upstreamResult = await forwardToUpstream({
      apiKey: authHeader,
      body: sanitizedBody,
      stream: false
    });

    const endTime = performance.now();
    const totalProxyLatencyMs = Number(Math.max(0.12, endTime - startTime).toFixed(2));

    const rawResponseData = upstreamResult.data;
    const responsePayloadData = isZK ? rawResponseData : rehydrationSession.rehydratePayload(rawResponseData);

    const finalResponseData = {
      ...responsePayloadData,
      privacyShieldMeta: {
        zeroKnowledgeMode: isZK,
        intercepted: true,
        actionTaken: threatEval.actionTaken,
        activeProfile: policy.activeProfile,
        riskLevel: threatEval.riskLevel,
        riskScore: threatEval.score,
        reasons: threatEval.reasons,
        piiTypesDetected: detectedPiiTypesArray,
        tokensRedacted: isZK ? 1 : totalTokensRedacted,
        proxyLatencyMs: totalProxyLatencyMs
      }
    };

    insertAuditLog({
      client_identifier: clientIp,
      pii_types_detected: detectedPiiTypesArray,
      tokens_redacted_count: isZK ? 1 : totalTokensRedacted,
      proxy_latency_ms: totalProxyLatencyMs,
      sanitized_prompt: fullSanitizedPromptText || '[Pre-Sanitized Client Prompt]',
      upstream_model: body.model || 'gpt-4o'
    }).catch(err => console.error('Error recording audit log:', err));

    rehydrationSession.destroy();

    return reply
      .status(upstreamResult.statusCode)
      .header('X-PrivacyShield-Zero-Knowledge', isZK.toString())
      .header('X-PrivacyShield-Policy-Profile', policy.activeProfile)
      .header('X-PrivacyShield-Latency-Ms', totalProxyLatencyMs.toString())
      .send(finalResponseData);
  });
}
