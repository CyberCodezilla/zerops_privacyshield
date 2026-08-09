import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getAuditLogs, getAnalytics, clearLogs } from '../db/index';
import { scanAndSanitize, redactPII } from '../engine/pii';
import { getActivePolicy, updateActivePolicy } from '../engine/policy';

export async function registerAuditRoutes(fastify: FastifyInstance) {
  fastify.get('/api/audit-logs', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as any;
    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;
    const piiType = query.piiType || 'ALL';
    const search = query.search || '';

    const data = await getAuditLogs({ limit, offset, piiType, search });
    return reply.send(data);
  });

  fastify.get('/api/analytics', async (request: FastifyRequest, reply: FastifyReply) => {
    const analytics = await getAnalytics();
    return reply.send(analytics);
  });

  fastify.get('/api/policy', async (request: FastifyRequest, reply: FastifyReply) => {
    const policy = getActivePolicy();
    return reply.send(policy);
  });

  fastify.post('/api/policy', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any || {};
    const updated = updateActivePolicy(body);
    return reply.send({ success: true, activePolicy: updated });
  });

  fastify.post('/api/scan-test', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any || {};
    const text = body.text || '';
    const policy = getActivePolicy();

    const result = await redactPII(text, policy.activeProfile);
    return reply.send({
      sanitizedText: result.sanitizedText,
      matches: result.matches,
      detectedPiiTypes: result.detectedPiiTypes,
      tokensRedactedCount: result.tokensRedactedCount,
      latencyMs: result.latencyMs,
      activeProfile: policy.activeProfile
    });
  });

  fastify.delete('/api/audit-logs', async (request: FastifyRequest, reply: FastifyReply) => {
    await clearLogs();
    return reply.send({ success: true, message: 'Audit logs cleared.' });
  });
}
