import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export interface AuditLogRecord {
  id: string;
  created_at: string;
  client_identifier: string;
  pii_types_detected: string[];
  tokens_redacted_count: number;
  proxy_latency_ms: number;
  sanitized_prompt: string;
  upstream_model: string;
}

let pool: Pool | null = null;
let isPgAvailable = false;
const memoryLogs: AuditLogRecord[] = [];

export async function initDatabase(): Promise<void> {
  const connectionString = process.env.DATABASE_URL || process.env.ZEROPS_POSTGRES_URL;
  
  if (connectionString) {
    try {
      pool = new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 3000,
      });

      const client = await pool.connect();
      await client.query(`
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            client_identifier VARCHAR(100) NOT NULL DEFAULT 'anonymous',
            pii_types_detected TEXT[] NOT NULL,
            tokens_redacted_count INT NOT NULL DEFAULT 0,
            proxy_latency_ms INT NOT NULL,
            sanitized_prompt TEXT NOT NULL,
            upstream_model VARCHAR(50) NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
      `);
      client.release();
      isPgAvailable = true;
      console.log('Successfully connected to PostgreSQL database & initialized tables.');
    } catch (err) {
      console.warn('PostgreSQL connection unavailable, using in-memory audit log store:', (err as Error).message);
      isPgAvailable = false;
    }
  } else {
    console.log('No DATABASE_URL provided. Operating with high-performance in-memory audit log store.');
  }

  // Pre-seed memory logs with realistic compliance audit samples if empty
  if (memoryLogs.length === 0) {
    seedInitialAuditLogs();
  }
}

function seedInitialAuditLogs() {
  const now = new Date();
  const seedData: Array<Omit<AuditLogRecord, 'id' | 'created_at'>> = [
    {
      client_identifier: '192.168.1.42',
      pii_types_detected: ['SSN', 'CREDIT_CARD'],
      tokens_redacted_count: 2,
      proxy_latency_ms: 4,
      sanitized_prompt: 'Patient [NAME_REDACTED_1] (SSN: [SSN_REDACTED_1]) paid using card [CARD_REDACTED_1]. Summarize medical history.',
      upstream_model: 'gpt-4o'
    },
    {
      client_identifier: '10.0.4.12',
      pii_types_detected: ['SECRET_KEY', 'DB_CONNECTION_STRING'],
      tokens_redacted_count: 2,
      proxy_latency_ms: 3,
      sanitized_prompt: 'Debug error log: Connection failed to [SECRET_KEY_REDACTED_1] using auth header Bearer [SECRET_KEY_REDACTED_2].',
      upstream_model: 'gpt-4o-mini'
    },
    {
      client_identifier: '172.16.0.88',
      pii_types_detected: ['EMAIL', 'PHONE'],
      tokens_redacted_count: 2,
      proxy_latency_ms: 2,
      sanitized_prompt: 'Support ticket #8892 for customer contact [EMAIL_REDACTED_1] reachable at [PHONE_REDACTED_1]. Issue with billing.',
      upstream_model: 'claude-3-5-sonnet'
    },
    {
      client_identifier: '192.168.1.105',
      pii_types_detected: ['SSN'],
      tokens_redacted_count: 1,
      proxy_latency_ms: 5,
      sanitized_prompt: 'Verify identity for SSN: [SSN_REDACTED_1] prior to loan approval.',
      upstream_model: 'gpt-4o'
    }
  ];

  seedData.forEach((item, index) => {
    const timestamp = new Date(now.getTime() - (index + 1) * 3600000).toISOString();
    memoryLogs.push({
      id: uuidv4(),
      created_at: timestamp,
      ...item
    });
  });
}

export async function insertAuditLog(log: Omit<AuditLogRecord, 'id' | 'created_at'>): Promise<AuditLogRecord> {
  const newLog: AuditLogRecord = {
    id: uuidv4(),
    created_at: new Date().toISOString(),
    ...log
  };

  if (isPgAvailable && pool) {
    try {
      const res = await pool.query(
        `INSERT INTO audit_logs (id, created_at, client_identifier, pii_types_detected, tokens_redacted_count, proxy_latency_ms, sanitized_prompt, upstream_model)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          newLog.id,
          newLog.created_at,
          newLog.client_identifier,
          newLog.pii_types_detected,
          newLog.tokens_redacted_count,
          newLog.proxy_latency_ms,
          newLog.sanitized_prompt,
          newLog.upstream_model
        ]
      );
      return res.rows[0];
    } catch (err) {
      console.error('Failed to insert audit log into PG, storing in memory fallback:', (err as Error).message);
    }
  }

  memoryLogs.unshift(newLog);
  return newLog;
}

export async function getAuditLogs(options?: {
  limit?: number;
  offset?: number;
  piiType?: string;
  search?: string;
}): Promise<{ logs: AuditLogRecord[]; total: number }> {
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  if (isPgAvailable && pool) {
    try {
      let query = 'SELECT * FROM audit_logs WHERE 1=1';
      const params: any[] = [];

      if (options?.piiType && options.piiType !== 'ALL') {
        params.push(options.piiType);
        query += ` AND $${params.length} = ANY(pii_types_detected)`;
      }

      if (options?.search) {
        params.push(`%${options.search}%`);
        query += ` AND (sanitized_prompt ILIKE $${params.length} OR client_identifier ILIKE $${params.length} OR upstream_model ILIKE $${params.length})`;
      }

      const countRes = await pool.query(`SELECT COUNT(*) FROM (${query}) AS filtered`, params);
      const total = parseInt(countRes.rows[0].count, 10);

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const res = await pool.query(query, params);
      return { logs: res.rows, total };
    } catch (err) {
      console.error('Error fetching logs from PG, falling back to memory store:', (err as Error).message);
    }
  }

  let filtered = [...memoryLogs];

  if (options?.piiType && options.piiType !== 'ALL') {
    filtered = filtered.filter(l => l.pii_types_detected.includes(options.piiType!));
  }

  if (options?.search) {
    const q = options.search.toLowerCase();
    filtered = filtered.filter(
      l =>
        l.sanitized_prompt.toLowerCase().includes(q) ||
        l.client_identifier.toLowerCase().includes(q) ||
        l.upstream_model.toLowerCase().includes(q)
    );
  }

  const paginated = filtered.slice(offset, offset + limit);
  return { logs: paginated, total: filtered.length };
}

export async function getAnalytics(): Promise<{
  totalRequests: number;
  totalTokensRedacted: number;
  avgLatencyMs: number;
  piiBreakdown: Record<string, number>;
  timeline: Array<{ time: string; count: number }>;
}> {
  const { logs } = await getAuditLogs({ limit: 1000 });

  const totalRequests = logs.length;
  const totalTokensRedacted = logs.reduce((acc, curr) => acc + curr.tokens_redacted_count, 0);
  const avgLatencyMs =
    totalRequests > 0
      ? Math.round((logs.reduce((acc, curr) => acc + curr.proxy_latency_ms, 0) / totalRequests) * 10) / 10
      : 0;

  const piiBreakdown: Record<string, number> = {};
  logs.forEach(log => {
    log.pii_types_detected.forEach(type => {
      piiBreakdown[type] = (piiBreakdown[type] || 0) + 1;
    });
  });

  // Timeline grouping by hour/day
  const timelineMap: Record<string, number> = {};
  logs.slice(0, 30).forEach(log => {
    const dateStr = new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    timelineMap[dateStr] = (timelineMap[dateStr] || 0) + 1;
  });

  const timeline = Object.entries(timelineMap).map(([time, count]) => ({ time, count })).reverse();

  return {
    totalRequests,
    totalTokensRedacted,
    avgLatencyMs,
    piiBreakdown,
    timeline
  };
}

export async function clearLogs(): Promise<void> {
  memoryLogs.length = 0;
  if (isPgAvailable && pool) {
    try {
      await pool.query('TRUNCATE TABLE audit_logs');
    } catch (err) {
      console.error('Failed to truncate audit_logs table:', err);
    }
  }
}
