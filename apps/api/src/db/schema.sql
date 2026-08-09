-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: audit_logs
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

-- Index for fast dashboard querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_pii_types ON audit_logs USING GIN(pii_types_detected);
