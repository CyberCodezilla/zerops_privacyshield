import Fastify from 'fastify';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import multipart from '@fastify/multipart';
import dotenv from 'dotenv';
import { initDatabase } from './db/index';
import { registerChatRoutes } from './routes/chat';
import { registerAuditRoutes } from './routes/audit';
import { registerOcrRoutes } from './routes/ocr';

dotenv.config();

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const host = process.env.HOST || '0.0.0.0';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

async function startServer() {
  try {
    // 1. Register Plugins
    await fastify.register(cors, {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    });
    await fastify.register(formbody);
    await fastify.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

    // 2. Health & Root Endpoints
    fastify.get('/health', async () => {
      return { status: 'healthy', service: 'PrivacyShield Gateway', timestamp: new Date().toISOString() };
    });

    fastify.get('/api/health', async () => {
      return { status: 'healthy', service: 'PrivacyShield Gateway', timestamp: new Date().toISOString() };
    });

    // 3. Initialize Database Client
    await initDatabase();

    // 4. Register API Routes
    await registerChatRoutes(fastify);
    await registerAuditRoutes(fastify);
    await registerOcrRoutes(fastify);

    // 5. Start Listening
    await fastify.listen({ port, host });
    console.log(`=======================================================`);
    console.log(` PrivacyShield Zero-Trust AI Proxy Gateway Online`);
    console.log(` Listening on: http://${host}:${port}`);
    console.log(` OpenAI Compatible Gateway: http://${host}:${port}/v1/chat/completions`);
    console.log(`=======================================================`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

startServer();
